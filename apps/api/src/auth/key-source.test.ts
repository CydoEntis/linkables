import { exportJWK, generateKeyPair } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mintToken, TEST_KEY_ID } from "../../test/auth/tokens";
import { createTestApp, TEST_AUTH, TEST_SUPABASE_URL } from "../../test/app";
import { createKeySource } from "./key-source";

const SUB = "3f2b8c1e-4d5a-4e6f-9a7b-1c2d3e4f5a6b";
const PRODUCTION_AUTH = { ...TEST_AUTH, nodeEnv: "production" as const, testJwks: undefined };

async function strangerJwksWithTestKid() {
  const { publicKey } = await generateKeyPair("ES256", { extractable: true });
  const jwk = await exportJWK(publicKey);
  return { keys: [{ ...jwk, kid: TEST_KEY_ID, alg: "ES256", use: "sig" }] };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("auth key source", () => {
  it.each(["production", "development"] as const)("refuses a local key set when NODE_ENV=%s", (nodeEnv) => {
    expect(() => createKeySource({ ...TEST_AUTH, nodeEnv })).toThrow(/NODE_ENV=test/);
  });

  it("verifies against the remote Supabase JWKS in production, so a test-key token is rejected", async () => {
    const jwks = await strangerJwksWithTestKid();
    const fetchSpy = vi.fn(() => Promise.resolve(Response.json(jwks)));
    vi.stubGlobal("fetch", fetchSpy);
    const token = await mintToken({ sub: SUB, supabaseUrl: TEST_SUPABASE_URL });

    const res = await createTestApp({ auth: PRODUCTION_AUTH }).request("/api/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(401);
    expect(fetchSpy).toHaveBeenCalledWith(TEST_AUTH.jwksUrl, expect.anything());
  });

  it("returns 500, not 401, when the remote JWKS cannot be fetched", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("down", { status: 503 }))));
    const token = await mintToken({ sub: SUB, supabaseUrl: TEST_SUPABASE_URL });

    const res = await createTestApp({ auth: PRODUCTION_AUTH }).request("/api/v1/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(res.status).toBe(500);
  });
});
