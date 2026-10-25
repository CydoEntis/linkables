import { failureEnvelopeSchema } from "@linkables/shared/http";
import { describe, expect, it } from "vitest";
import { createTestApp } from "../../test/app";

type App = ReturnType<typeof createTestApp>;

// No database is reachable here, so a request that queried it would fail with a 500.
function post(app: App, body: unknown, headers: Record<string, string> = {}) {
  return app.request("/api/v1/access-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const BOT = { email: "bot@example.com", website: "https://spam.example" };

async function errorCode(res: Response) {
  return failureEnvelopeSchema.parse(await res.json()).error.code;
}

describe("POST /access-requests", () => {
  it("rejects a request without an email", async () => {
    const res = await post(createTestApp(), { name: "Sam" });

    expect(res.status).toBe(400);
    expect(await errorCode(res)).toBe("VALIDATION");
  });

  it("rejects an address that is not an email", async () => {
    const res = await post(createTestApp(), { email: "sam at example" });

    expect(res.status).toBe(400);
    expect(failureEnvelopeSchema.parse(await res.json()).error.details).toEqual({
      fieldErrors: { email: "Enter a valid email address" },
    });
  });

  it("rejects a use case longer than 500 characters", async () => {
    const res = await post(createTestApp(), { email: "sam@example.com", useCase: "x".repeat(501) });

    expect(await errorCode(res)).toBe("VALIDATION");
  });

  it("rejects a body larger than 4 KB", async () => {
    const res = await post(createTestApp(), { ...BOT, padding: "x".repeat(4 * 1024) });

    expect(res.status).toBe(400);
    expect(await errorCode(res)).toBe("VALIDATION");
  });

  it("answers a filled honeypot with success without storing anything", async () => {
    const res = await post(createTestApp(), BOT);

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, data: null });
  });

  it("needs no sign-in", async () => {
    const res = await post(createTestApp(), BOT);

    expect(res.status).not.toBe(401);
  });

  it("limits one address to 5 requests an hour", async () => {
    let now = 0;
    const app = createTestApp({ now: () => now });
    const ip = { "X-Real-IP": "203.0.113.7" };
    for (let i = 0; i < 5; i += 1) expect((await post(app, BOT, ip)).status).toBe(200);

    const limited = await post(app, BOT, ip);
    now = 60 * 60 * 1000;
    const nextHour = await post(app, BOT, ip);

    expect(limited.status).toBe(429);
    expect(await errorCode(limited)).toBe("RATE_LIMIT");
    expect(limited.headers.get("Retry-After")).toBe("3600");
    expect(nextHour.status).toBe(200);
  });

  it("counts each address on its own", async () => {
    const app = createTestApp({ now: () => 0 });
    for (let i = 0; i < 5; i += 1) await post(app, BOT, { "X-Real-IP": "203.0.113.7" });

    expect((await post(app, BOT, { "X-Real-IP": "198.51.100.2" })).status).toBe(200);
  });

  it("has no route that reads requests back", async () => {
    const res = await createTestApp().request("/api/v1/access-requests");

    expect(res.status).toBe(401);
  });
});
