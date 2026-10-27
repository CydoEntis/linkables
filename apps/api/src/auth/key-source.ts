import { createLocalJWKSet, createRemoteJWKSet, type JSONWebKeySet, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import type { Config } from "../config/env";

export type AuthConfig = Config["auth"] & { nodeEnv: Config["nodeEnv"] };

const jwksSchema = z.object({ keys: z.array(z.looseObject({ kty: z.string() })).min(1) });

function parseJwks(json: string): JSONWebKeySet {
  return jwksSchema.parse(JSON.parse(json));
}

// This file is one of the two allowed exceptions to the no-outbound-HTTP rule
// (plan Rule 2, ADR-0002; see eslint.config.js): jose's remote key set calls
// global fetch. The URL comes from SUPABASE_URL in config, never from a user,
// so the SSRF-guarded fetcher does not apply.
//
// The env schema already refuses AUTH_TEST_JWKS outside NODE_ENV=test; the
// check here keeps a local key from being trusted even if config is built
// some other way.
export function createKeySource({ nodeEnv, jwksUrl, testJwks }: AuthConfig): JWTVerifyGetKey {
  if (testJwks === undefined) return createRemoteJWKSet(new URL(jwksUrl));
  if (nodeEnv !== "test") throw new Error("AUTH_TEST_JWKS is only allowed when NODE_ENV=test");
  return createLocalJWKSet(parseJwks(testJwks));
}
