import type { ExtensionSession } from "@linkables/shared/extension-sessions";
import { Hono } from "hono";
import type { AuthEnv } from "../auth/require-auth";
import { ok } from "../http/envelope";
import { InternalError, UpstreamError } from "../http/errors";
import { rateLimit } from "../http/rate-limit";
import type { Logger } from "../log/logger";
import type { SignInLink, SupabaseAdmin } from "./supabase-admin";

// supabaseAdmin is undefined when SUPABASE_SECRET_KEY is not configured.
export type ExtensionSessionRoutesDeps = {
  logger: Logger;
  now: () => number;
  supabaseAdmin: SupabaseAdmin | undefined;
};

const HOUR_MS = 60 * 60 * 1000;
// A visit mints at most one token, and only while the extension is signed out.
const TOKENS_PER_HOUR = 20;
const USERS_TRACKED = 10_000;
const UNAVAILABLE = "Signing in the extension from linkables.app is unavailable right now. Use Google or an email code.";

function refuse(logger: Logger, reason: string, error?: unknown): never {
  logger.warn(`extension session refused: ${reason}`, error === undefined ? {} : { error });
  throw new UpstreamError(UNAVAILABLE);
}

// The email Supabase holds, not the token's optional claim: the link must be for this account.
async function signInLinkFor(admin: SupabaseAdmin, userId: string, logger: Logger): Promise<SignInLink> {
  const failed = (error: unknown) => refuse(logger, "Supabase admin call failed", error);
  const email = await admin.emailOf(userId).catch(failed);
  if (email === undefined) refuse(logger, "the account has no email address");
  return admin.magicLink(email).catch(failed);
}

// Neither the user's email nor the token hash is ever logged.
export function extensionSessionRoutes({ logger, now, supabaseAdmin }: ExtensionSessionRoutesDeps) {
  const mintLimit = rateLimit<AuthEnv>({
    limit: TOKENS_PER_HOUR,
    windowMs: HOUR_MS,
    maxKeys: USERS_TRACKED,
    now,
    key: (c) => c.get("userId"),
    message: "Too many requests, try again later",
    whenFull: { message: "Signing in the extension is busy. Try again in a few minutes.", logger, name: "extension-sessions" },
  });

  return new Hono<AuthEnv>().post("/extension-sessions", mintLimit, async (c) => {
    if (supabaseAdmin === undefined) refuse(logger, "SUPABASE_SECRET_KEY is not configured");
    const userId = c.get("userId");
    const link = await signInLinkFor(supabaseAdmin, userId, logger);
    if (link.userId !== userId) {
      logger.error("extension session refused: Supabase made the link for another account");
      throw new InternalError("Could not sign in the extension");
    }
    c.header("Cache-Control", "no-store");
    return ok(c, { tokenHash: link.tokenHash } satisfies ExtensionSession);
  });
}
