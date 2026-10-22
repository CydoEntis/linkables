import { createMiddleware } from "hono/factory";
import { errors, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import { z } from "zod";
import type { AppEnv } from "../http/env";
import { UnauthenticatedError, UpstreamError } from "../http/errors";
import type { Logger } from "../log/logger";
import { createKeySource, type AuthConfig } from "./key-source";

export type AuthEnv = { Variables: AppEnv["Variables"] & { userId: string } };

const BEARER = /^Bearer (\S+)$/i;

// Only errors that say the token itself is bad become 401. Anything else from
// jwtVerify means the key set could not be loaded (network, non-200, bad JSON,
// timeout), which is an upstream outage, not a reason to sign every user out.
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

type Verification =
  | { kind: "valid"; payload: JWTPayload }
  | { kind: "invalid" }
  | { kind: "keys-unavailable"; cause: unknown };

async function verify(token: string, getKey: JWTVerifyGetKey, issuer: string): Promise<Verification> {
  try {
    const { payload } = await jwtVerify(token, getKey, {
      issuer,
      audience: "authenticated",
      algorithms: ["ES256"],
      requiredClaims: ["exp", "sub"],
    });
    return { kind: "valid", payload };
  } catch (err) {
    if (TOKEN_ERRORS.some((tokenError) => err instanceof tokenError)) return { kind: "invalid" };
    return { kind: "keys-unavailable", cause: err };
  }
}

export function requireAuth(config: AuthConfig, logger: Logger) {
  const getKey = createKeySource(config);
  return createMiddleware<AuthEnv>(async (c, next) => {
    const verification = await verify(bearerToken(c.req.header("Authorization")), getKey, config.issuer);
    if (verification.kind === "keys-unavailable") {
      logger.error("auth key set unavailable", { requestId: c.get("requestId"), err: verification.cause });
      throw new UpstreamError("Authentication service unavailable");
    }
    const claims = verification.kind === "valid" ? claimsSchema.safeParse(verification.payload) : undefined;
    if (!claims?.success) throw new UnauthenticatedError("Invalid token");
    c.set("userId", claims.data.sub);
    await next();
  });
}
