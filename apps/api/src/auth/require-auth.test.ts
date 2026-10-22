import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkaroo/shared/http";
import { exportJWK, generateKeyPair, SignJWT, type JWTPayload } from "jose";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defaultClaims, mintToken, signTestToken, TEST_KEY_ID, testJwks } from "../../test/auth/tokens";
import { createTestApp, TEST_AUTH, TEST_SUPABASE_URL, testUsers } from "../../test/app";

const SUB = "3f2b8c1e-4d5a-4e6f-9a7b-1c2d3e4f5a6b";
const meEnvelope = successEnvelopeSchema(z.strictObject({ id: z.string() }));

function getMe(headers: Record<string, string> = {}) {
  return createTestApp().request("/api/v1/me", { headers });
}

function getMeWith(token: string) {
  return getMe({ Authorization: `Bearer ${token}` });
}

async function expectUnauthenticated(res: Response) {
  expect(res.status).toBe(401);
  expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("UNAUTHENTICATED");
}

async function signWithStrangerKey(kid: string) {
  const { privateKey } = await generateKeyPair("ES256");
  return new SignJWT(defaultClaims(SUB, TEST_SUPABASE_URL))
    .setProtectedHeader({ alg: "ES256", kid, typ: "JWT" })
    .sign(privateKey);
}

function unsignedToken(header: object, payload: JWTPayload) {
  const encode = (part: object) => Buffer.from(JSON.stringify(part)).toString("base64url");
  return `${encode(header)}.${encode(payload)}.`;
}

async function hs256Token() {
  const secret = new TextEncoder().encode("a-shared-secret-of-at-least-32-bytes!!");
  return new SignJWT(defaultClaims(SUB, TEST_SUPABASE_URL))
    .setProtectedHeader({ alg: "HS256", kid: TEST_KEY_ID, typ: "JWT" })
    .sign(secret);
}

describe("auth", () => {
  it("returns the token's sub from GET /me for a valid token", async () => {
    const res = await getMeWith(await mintToken({ sub: SUB, supabaseUrl: TEST_SUPABASE_URL }));

    expect(res.status).toBe(200);
    expect(meEnvelope.parse(await res.json()).data).toEqual({ id: SUB });
  });

  it("gives each of two users their own id from GET /me", async () => {
    const { a, b } = await testUsers();

    const [resA, resB] = await Promise.all([getMe(a.headers), getMe(b.headers)]);

    expect(meEnvelope.parse(await resA.json()).data).toEqual({ id: a.id });
    expect(meEnvelope.parse(await resB.json()).data).toEqual({ id: b.id });
  });

  it("rejects a request without a token", async () => {
    await expectUnauthenticated(await getMe());
  });

  it.each([
    ["a non-Bearer scheme", (token: string) => `Basic ${token}`],
    ["a Bearer header with no token", () => "Bearer "],
    ["a token that is not a JWT", () => "Bearer not-a-jwt"],
    ["two tokens", (token: string) => `Bearer ${token} ${token}`],
  ])("rejects %s", async (_label, header) => {
    const token = await mintToken({ sub: SUB, supabaseUrl: TEST_SUPABASE_URL });

    await expectUnauthenticated(await getMe({ Authorization: header(token) }));
  });

  it.each<[string, JWTPayload]>([
    ["a wrong issuer", { iss: "https://other-ref.supabase.co/auth/v1" }],
    ["a wrong audience", { aud: "anon" }],
    ["an expired token", { exp: Math.floor(Date.now() / 1000) - 60 }],
    ["a sub that is not a user id", { sub: "service_role" }],
  ])("rejects %s", async (_label, claims) => {
    await expectUnauthenticated(await getMeWith(await mintToken({ sub: SUB, supabaseUrl: TEST_SUPABASE_URL, claims })));
  });

  it("rejects a token without an expiry", async () => {
    const claims = defaultClaims(SUB, TEST_SUPABASE_URL);
    delete claims.exp;

    await expectUnauthenticated(await getMeWith(await signTestToken(claims)));
  });

  it("rejects a token signed by an unknown key that claims the test key id", async () => {
    await expectUnauthenticated(await getMeWith(await signWithStrangerKey(TEST_KEY_ID)));
  });

  it("rejects a token signed by an unknown key with its own key id", async () => {
    await expectUnauthenticated(await getMeWith(await signWithStrangerKey("stranger")));
  });

  it("rejects an unsigned alg none token", async () => {
    const token = unsignedToken({ alg: "none", typ: "JWT" }, defaultClaims(SUB, TEST_SUPABASE_URL));

    await expectUnauthenticated(await getMeWith(token));
  });

  it("rejects an HS256 token", async () => {
    await expectUnauthenticated(await getMeWith(await hs256Token()));
  });

  it("rejects an RS256 token even when its key is in the trusted key set", async () => {
    const { publicKey, privateKey } = await generateKeyPair("RS256", { extractable: true });
    const rsaJwk = { ...(await exportJWK(publicKey)), kid: "rsa" };
    const auth = { ...TEST_AUTH, testJwks: JSON.stringify({ keys: [...testJwks.keys, rsaJwk] }) };
    const token = await new SignJWT(defaultClaims(SUB, TEST_SUPABASE_URL))
      .setProtectedHeader({ alg: "RS256", kid: "rsa", typ: "JWT" })
      .sign(privateKey);

    const res = await createTestApp({ auth }).request("/api/v1/me", { headers: { Authorization: `Bearer ${token}` } });

    await expectUnauthenticated(res);
  });

  it("serves /health without a token", async () => {
    const res = await createTestApp().request("/health");

    expect(res.status).toBe(200);
  });

  it("answers a preflight from an allowed origin without a token", async () => {
    const origin = "http://localhost:5173";
    const res = await createTestApp().request("/api/v1/me", {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" },
    });

    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });

  it("rejects an unknown /api/v1 path without a token instead of revealing it does not exist", async () => {
    await expectUnauthenticated(await createTestApp().request("/api/v1/does-not-exist"));
  });
});
