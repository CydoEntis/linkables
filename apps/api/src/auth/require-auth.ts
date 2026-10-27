import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../http/env";
import { UnauthenticatedError } from "../http/errors";
import type { LocalAuth } from "./local-auth";
import { copyCookies } from "./routes";

export type AuthEnv = { Variables: AppEnv["Variables"] & { userId: string; userEmail: string | undefined } };

export function requireAuth(auth: LocalAuth) {
  return createMiddleware<AuthEnv>(async (c, next) => {
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
