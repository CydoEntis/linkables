import { failureEnvelopeSchema } from "@linkaroo/shared/http";
import { HTTPException } from "hono/http-exception";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import { ConflictError } from "./errors";

function appThrowing(error: unknown) {
  const app = createApp();
  app.get("/throws", () => {
    throw error;
  });
  return app;
}

async function failureOf(res: Response) {
  return failureEnvelopeSchema.parse(await res.json());
}

describe("error handling", () => {
  it("returns 404 NOT_FOUND for an unknown /api/v1 path", async () => {
    const res = await createApp().request("/api/v1/does-not-exist");

    expect(res.status).toBe(404);
    expect((await failureOf(res)).error.code).toBe("NOT_FOUND");
  });

  it("returns 500 INTERNAL without a stack for an unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const res = await appThrowing(new Error("db password is hunter2")).request("/throws");

    expect(res.status).toBe(500);
    const text = await res.text();
    const body = failureEnvelopeSchema.parse(JSON.parse(text));
    expect(body.error.code).toBe("INTERNAL");
    expect(text).not.toContain("hunter2");
    expect(text).not.toContain("at ");
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
