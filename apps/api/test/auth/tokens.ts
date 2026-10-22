// Depends only on jose and the fixture so the web e2e suite can import it
// without loading API runtime code.
import { importJWK, SignJWT, type JSONWebKeySet, type JWTPayload } from "jose";
import fixture from "../fixtures/test-jwks.json" with { type: "json" };

function fixtureKey() {
  const [key] = fixture.keys;
  if (key === undefined) throw new Error("test-jwks.json holds no key");
  return key;
}

const privateJwk = fixtureKey();

export const TEST_KEY_ID = privateJwk.kid;

export const testJwks: JSONWebKeySet = {
  keys: fixture.keys.map(({ kty, crv, x, y, kid, alg, use }) => ({ kty, crv, x, y, kid, alg, use })),
};

export function defaultClaims(sub: string, supabaseUrl: string): JWTPayload {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: `${supabaseUrl.replace(/\/+$/, "")}/auth/v1`,
    aud: "authenticated",
    sub,
    role: "authenticated",
    iat: now,
    exp: now + 3600,
  };
}

export async function signTestToken(payload: JWTPayload): Promise<string> {
  const key = await importJWK(privateJwk, "ES256");
  return new SignJWT(payload).setProtectedHeader({ alg: "ES256", kid: TEST_KEY_ID, typ: "JWT" }).sign(key);
}

export type MintOptions = { sub: string; supabaseUrl: string; claims?: JWTPayload };

export function mintToken({ sub, supabaseUrl, claims = {} }: MintOptions): Promise<string> {
  return signTestToken({ ...defaultClaims(sub, supabaseUrl), ...claims });
}
