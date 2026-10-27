import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { createTestApp, testUsers } from "../../test/app";

const meEnvelope = successEnvelopeSchema(z.object({ id: z.uuid() }));

describe("local session authorization", () => {
  it("gives two signed-in users their own identity", async () => {
    const { a, b } = await testUsers();
    const app = createTestApp();
    const responseA = await app.request("/api/v1/me", { headers: a.headers });
    const responseB = await app.request("/api/v1/me", { headers: b.headers });
    expect(meEnvelope.parse(await responseA.json()).data.id).toBe(a.id);
    expect(meEnvelope.parse(await responseB.json()).data.id).toBe(b.id);
  });

  it.each([undefined, "Bearer unknown-token", "Basic abc", "Bearer a b", "Bearer "])("rejects invalid credentials %s", async (authorization) => {
    const response = await createTestApp().request("/api/v1/me", { headers: authorization ? { Authorization: authorization } : {} });
    expect(response.status).toBe(401);
    expect(failureEnvelopeSchema.parse(await response.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("serves health without signing in", async () => {
    expect((await createTestApp().request("/health")).status).toBe(200);
  });

  it("answers allowed browser preflights before authentication", async () => {
    const response = await createTestApp().request("/api/v1/me", { method: "OPTIONS", headers: {
      Origin: "http://localhost:5173", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization",
    } });
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:5173");
  });
});
