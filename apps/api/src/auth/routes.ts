import { sessionSchema, signInRequestSchema } from "@linkables/shared/auth";
import { APIError } from "better-auth";
import { Hono, type Context } from "hono";
import { validator } from "hono/validator";
import type { AppEnv } from "../http/env";
import { ok } from "../http/envelope";
import { ForbiddenError, RateLimitError, UnauthenticatedError } from "../http/errors";
import { parseWith } from "../http/validate";
import type { AuthConfig, LocalAuth } from "./local-auth";

export function copyCookies(c: Context, headers: Headers): void {
  for (const cookie of headers.getSetCookie()) c.header("Set-Cookie", cookie, { append: true });
}

export function requireTrustedOrigin(headers: Headers, config: AuthConfig): void {
  const origin = headers.get("Origin");
  if (origin === null) return;
  if (origin !== config.appOrigin && !config.trustedOrigins.includes(origin) && !/^moz-extension:\/\/[a-zA-Z0-9-]+$/.test(origin)) {
    throw new ForbiddenError("Origin is not allowed");
  }
}

type SignInWindow = { attempts: number; expiresAt: number };

// Account limits prevent guessing; a process-wide ceiling also bounds expensive
// password checks when an attacker rotates email addresses.
function signInLimiter(now: () => number) {
  const accounts = new Map<string, SignInWindow>();
  let global: SignInWindow = { attempts: 0, expiresAt: 0 };
  return (email: string) => {
    const at = now();
    if (global.expiresAt <= at) global = { attempts: 0, expiresAt: at + 60_000 };
    for (const [key, window] of accounts) if (window.expiresAt <= at) accounts.delete(key);
    const account = accounts.get(email) ?? { attempts: 0, expiresAt: at + 60_000 };
    global.attempts++;
    account.attempts++;
    if (global.attempts > 60 || account.attempts > 5) throw new RateLimitError("Too many sign-in attempts. Try again in a minute.");
    accounts.set(email, account);
  };
}

export function authRoutes(auth: LocalAuth, config: AuthConfig, now: () => number) {
  const limit = signInLimiter(now);
  return new Hono<AppEnv>()
    .use("/auth/*", async (c, next) => {
      c.header("Cache-Control", "no-store");
      requireTrustedOrigin(c.req.raw.headers, config);
      await next();
    })
    .post("/auth/sign-in", validator("json", parseWith(signInRequestSchema, "Invalid sign-in details")), async (c) => {
      const body = c.req.valid("json");
      limit(body.email);
      try {
        const result = await auth.api.signInEmail({ body, headers: c.req.raw.headers, returnHeaders: true });
        copyCookies(c, result.headers);
        const headers = new Headers({ Authorization: `Bearer ${result.response.token}` });
        const session = await auth.api.getSession({ headers });
        if (!session) throw new UnauthenticatedError("Could not start session");
        return ok(c, sessionSchema.parse({
          user: { id: session.user.id, email: session.user.email, name: session.user.name },
          token: session.session.token,
          expiresAt: session.session.expiresAt.toISOString(),
        }));
      } catch (error) {
        if (error instanceof APIError && (error.statusCode === 401 || error.statusCode === 400)) {
          throw new UnauthenticatedError("Email or password is incorrect");
        }
        throw error;
      }
    })
    .get("/auth/session", async (c) => {
      const result = await auth.api.getSession({ headers: c.req.raw.headers, returnHeaders: true });
      if (!result.response) throw new UnauthenticatedError("Sign in to continue");
      copyCookies(c, result.headers);
      const { user, session } = result.response;
      return ok(c, sessionSchema.parse({ user: { id: user.id, email: user.email, name: user.name }, token: session.token, expiresAt: session.expiresAt.toISOString() }));
    })
    .post("/auth/sign-out", async (c) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session) throw new UnauthenticatedError("Sign in to continue");
      const result = await auth.api.signOut({ headers: c.req.raw.headers, returnHeaders: true });
      copyCookies(c, result.headers);
      return ok(c, null);
    });
}
