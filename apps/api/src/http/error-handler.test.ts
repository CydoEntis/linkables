import { failureEnvelopeSchema } from "@linkaroo/shared/http";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it } from "vitest";
import { captureLogger, createTestApp, testUsers } from "../../test/app";
import type { Logger } from "../log/logger";
import { ConflictError } from "./errors";

function appThrowing(error: unknown, logger: Logger = captureLogger().logger) {
  const app = createTestApp({ logger });
  app.get("/throws", () => {
    throw error;
  });
  return app;
}

function errorEntry(lines: string[]) {
  return lines.map((line) => JSON.parse(line) as { level: string }).find((entry) => entry.level === "error");
}

async function failureOf(res: Response) {
  return failureEnvelopeSchema.parse(await res.json());
}

describe("error handling", () => {
  it("returns 404 NOT_FOUND for an unknown /api/v1 path", async () => {
    const { a } = await testUsers();
    const res = await createTestApp().request("/api/v1/does-not-exist", { headers: a.headers });

    expect(res.status).toBe(404);
    expect((await failureOf(res)).error.code).toBe("NOT_FOUND");
  });

  it("returns 500 INTERNAL without a stack for an unexpected error", async () => {
    const res = await appThrowing(new Error("db password is hunter2")).request("/throws");

    expect(res.status).toBe(500);
    const text = await res.text();
    const body = failureEnvelopeSchema.parse(JSON.parse(text));
    expect(body.error.code).toBe("INTERNAL");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("at ");
  });

  it("returns 500 INTERNAL with a request id when a non-Error value is thrown", async () => {
    const res = await appThrowing("db password is hunter2").request("/throws");

    expect(res.status).toBe(500);
    expect(res.headers.get("X-Request-Id")).toBeTruthy();
    const text = await res.text();
    expect(failureEnvelopeSchema.parse(JSON.parse(text)).error.code).toBe("INTERNAL");
    expect(text).not.toContain("hunter2");
  });

  it("logs an unexpected error with its request id", async () => {
    const { logger, lines } = captureLogger();
    const res = await appThrowing(new Error("db down"), logger).request("/throws");

    const entry = errorEntry(lines);
    expect(entry).toMatchObject({
      msg: "unexpected error",
      requestId: res.headers.get("X-Request-Id"),
      err: { message: "db down" },
    });
  });

  it("logs the original message, redacted, when the error cannot be serialized as-is", async () => {
    const { logger, lines } = captureLogger();
    const err = new Error("GET https://a.test/p?token=SECRET failed");
    err.cause = err;
    await appThrowing(err, logger).request("/throws");

    expect(lines.join("\n")).not.toContain("SECRET");
    expect(errorEntry(lines)).toMatchObject({ err: { message: "GET https://a.test/p failed" } });
  });

  it("logs a thrown non-Error value as the cause", async () => {
    const { logger, lines } = captureLogger();
    await appThrowing("plain string", logger).request("/throws");

    const entry = errorEntry(lines);
    expect(entry).toMatchObject({ err: { cause: "plain string" } });
  });

  it("serves a thrown error subclass with its code and status", async () => {
    const res = await appThrowing(new ConflictError("Already saved", { id: "1" })).request("/throws");

    expect(res.status).toBe(409);
    const body = await failureOf(res);
    expect(body.error).toEqual({ code: "CONFLICT", message: "Already saved", details: { id: "1" } });
  });

  it.each([
    [400, 400, "VALIDATION"],
    [413, 400, "VALIDATION"],
    [401, 401, "UNAUTHENTICATED"],
    [404, 404, "NOT_FOUND"],
    [429, 429, "RATE_LIMIT"],
    [403, 500, "INTERNAL"],
    [503, 500, "INTERNAL"],
  ] as const)("maps an HTTPException %i to %i %s", async (thrown, status, code) => {
    const exception = new HTTPException(thrown, { message: "framework text" });
    const res = await appThrowing(exception).request("/throws");

    expect(res.status).toBe(status);
    const body = await failureOf(res);
    expect(body.error.code).toBe(code);
    expect(body.error.message).not.toBe("framework text");
  });
});
