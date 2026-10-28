import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../http/env";
import { UnauthenticatedError } from "../http/errors";
import type { AuthConfig, LocalAuth } from "./local-auth";
import { copyCookies, requireTrustedOrigin } from "./routes";

export type AuthEnv = { Variables: AppEnv["Variables"] & { userId: string; userEmail: string | undefined } };

export function requireAuth(auth: LocalAuth, config: AuthConfig) {
  return createMiddleware<AuthEnv>(async (c, next) => {
    // CORS blocks reading responses, not simple cross-origin form submissions.
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method)) requireTrustedOrigin(c.req.raw.headers, config);
    const authorization = c.req.header("Authorization");
    if (authorization !== undefined && !/^Bearer \S+$/i.test(authorization)) throw new UnauthenticatedError("Invalid bearer token");
    const result = await auth.api.getSession({ headers: c.req.raw.headers, returnHeaders: true });
    if (!result.response) throw new UnauthenticatedError("Sign in to continue");
    copyCookies(c, result.headers);
    c.set("userId", result.response.user.id);
    c.set("userEmail", result.response.user.email);
    await next();
  });
}
