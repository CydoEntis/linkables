import { createMiddleware } from "hono/factory";
import { errors, jwtVerify, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import type { AppEnv } from "../http/env";
import { UnauthenticatedError } from "../http/errors";
import { createKeySource, type AuthConfig } from "./key-source";

export type AuthEnv = { Variables: AppEnv["Variables"] & { userId: string } };

const BEARER = /^Bearer (\S+)$/i;

// Only errors that say the token itself is bad become 401. Key-set fetch
// failures propagate to the top-level handler so an auth outage is logged as a
// 500 instead of signing every user out.
const TOKEN_ERRORS = [
  errors.JWTClaimValidationFailed,
  errors.JWTExpired,
  errors.JWTInvalid,
  errors.JWSInvalid,
  errors.JWSSignatureVerificationFailed,
  errors.JOSEAlgNotAllowed,
  errors.JOSENotSupported,
  errors.JWKSNoMatchingKey,
  errors.JWKSMultipleMatchingKeys,
];

const claimsSchema = z.object({ sub: z.uuid() });

function bearerToken(header: string | undefined): string {
  const token = BEARER.exec(header ?? "")?.[1];
  if (token === undefined) throw new UnauthenticatedError("Missing bearer token");
  return token;
}

async function verifiedUserId(token: string, getKey: JWTVerifyGetKey, issuer: string): Promise<string> {
  try {
    const { payload } = await jwtVerify(token, getKey, {
      issuer,
      audience: "authenticated",
      algorithms: ["ES256"],
      requiredClaims: ["exp", "sub"],
    });
    const claims = claimsSchema.safeParse(payload);
    if (!claims.success) throw new UnauthenticatedError("Invalid token");
    return claims.data.sub;
  } catch (err) {
    if (TOKEN_ERRORS.some((tokenError) => err instanceof tokenError)) throw new UnauthenticatedError("Invalid token");
    throw err;
  }
}

export function requireAuth(config: AuthConfig) {
  const getKey = createKeySource(config);
  return createMiddleware<AuthEnv>(async (c, next) => {
    const token = bearerToken(c.req.header("Authorization"));
    c.set("userId", await verifiedUserId(token, getKey, config.issuer));
    await next();
  });
}
