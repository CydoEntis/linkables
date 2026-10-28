import { Hono } from "hono";
import type { NotifyAccountDeleted } from "../access/notify-owner";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import { rateLimit } from "../http/rate-limit";
import type { Logger } from "../log/logger";
import { deleteAccountData } from "./delete-account";

// Notifications are optional; local account and session deletion never needs email.
export type AccountRoutesDeps = {
  db: Db;
  logger: Logger;
  now: () => number;
  notifyAccountDeleted: NotifyAccountDeleted | undefined;
};

const HOUR_MS = 60 * 60 * 1000;
// Bound repeated deletion attempts and optional operator notifications.
const DELETES_PER_HOUR = 3;
const USERS_TRACKED = 10_000;

// The user's id and email go to the owner by email only; every log line here leaves them out.
export function accountRoutes({ db, logger, now, notifyAccountDeleted }: AccountRoutesDeps) {
  const deleteLimit = rateLimit<AuthEnv>({
    limit: DELETES_PER_HOUR,
    windowMs: HOUR_MS,
    maxKeys: USERS_TRACKED,
    now,
    key: (c) => c.get("userId"),
    message: "Too many requests, try again later",
    whenFull: { message: "Account deletion is busy. Try again in a few minutes.", logger, name: "account-delete" },
  });
  return new Hono<AuthEnv>().delete("/me", deleteLimit, async (c) => {
    const userId = c.get("userId");
    await deleteAccountData(db, userId);
    if (notifyAccountDeleted) {
      try {
        await notifyAccountDeleted({ userId, email: c.get("userEmail"), at: new Date(now()) });
      } catch (error) {
        logger.warn("account deleted but optional owner notification failed", { error });
      }
    }
    return ok(c, null);
  });
}
