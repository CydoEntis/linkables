import { Hono } from "hono";
import type { NotifyAccountDeleted } from "../access/notify-owner";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import type { Logger } from "../log/logger";
import { deleteAccountData } from "./delete-account";

// notifyAccountDeleted is undefined when Resend is not configured.
export type AccountRoutesDeps = {
  db: Db;
  logger: Logger;
  now: () => number;
  notifyAccountDeleted: NotifyAccountDeleted | undefined;
};

// The user's id and email go to the owner by email only; every log line here leaves them out.
export function accountRoutes({ db, logger, now, notifyAccountDeleted }: AccountRoutesDeps) {
  return new Hono<AuthEnv>().delete("/me", async (c) => {
    const userId = c.get("userId");
    await deleteAccountData(db, userId);
    if (notifyAccountDeleted === undefined) {
      logger.warn("account deleted, owner not emailed: Resend is not configured");
    } else {
      // Not awaited: the data is already gone, so the user's answer never waits on the owner's email.
      notifyAccountDeleted({ userId, email: c.get("userEmail"), at: new Date(now()) }).catch((error: unknown) => {
        logger.warn("account deleted, owner email failed", { error });
      });
    }
    return ok(c, null);
  });
}
