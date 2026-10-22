import { describe, expect, it } from "vitest";
import { createTestApp } from "../../test/app";

const ALLOWED = "https://app.example.com";

function requestFrom(origin: string, path = "/health") {
  return createTestApp({ corsOrigins: [ALLOWED] }).request(path, { headers: { Origin: origin } });
}

describe("CORS", () => {
  it("echoes an allowed origin and exposes X-Request-Id", async () => {
    const res = await requestFrom(ALLOWED);

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
    expect(res.headers.get("Access-Control-Expose-Headers")).toContain("X-Request-Id");
  });

  it("sends no Access-Control-Allow-Origin to an origin not in the allowlist", async () => {
    const res = await requestFrom("https://evil.example.com");

    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });

  it("keeps CORS headers on an error response", async () => {
    const res = await requestFrom(ALLOWED, "/api/v1/missing");

    expect(res.status).toBe(404);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
  });

  it("answers a preflight from an allowed origin", async () => {
    const res = await createTestApp({ corsOrigins: [ALLOWED] }).request("/api/v1/links", {
      method: "OPTIONS",
      headers: { Origin: ALLOWED, "Access-Control-Request-Method": "POST" },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ALLOWED);
  });
});
