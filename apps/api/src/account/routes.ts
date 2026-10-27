import { Hono } from "hono";
import type { DeletionNotice, NotifyAccountDeleted } from "../access/notify-owner";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import { UpstreamError } from "../http/errors";
import { rateLimit } from "../http/rate-limit";
import type { Logger } from "../log/logger";
import { deleteAccountData } from "./delete-account";

// notifyAccountDeleted is undefined when Resend is not configured, and then no account can be deleted.
export type AccountRoutesDeps = {
  db: Db;
  logger: Logger;
  now: () => number;
  notifyAccountDeleted: NotifyAccountDeleted | undefined;
};

const HOUR_MS = 60 * 60 * 1000;
// Each attempt emails the owner through the Resend account that also sends sign-in
// codes, so repeat calls must not spend its quota. Failed attempts count too, since
// they reach Resend as well; three still leaves two retries in a Resend outage.
const DELETES_PER_HOUR = 3;
const DELETE_UNAVAILABLE = "Account deletion is unavailable right now. Nothing was deleted. Try again later.";
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
  // The owner's email is the only record of whose sign-in to remove, so it goes
  // first: if it can't be sent, nothing is deleted and the user can try again.
  // A retry after a sent email but a failed delete only sends a duplicate.
  async function emailOwner(notice: DeletionNotice): Promise<void> {
    if (notifyAccountDeleted === undefined) {
      logger.warn("account delete refused: Resend is not configured");
      throw new UpstreamError(DELETE_UNAVAILABLE);
    }
    const sent = await notifyAccountDeleted(notice).then(
      () => true,
      (error: unknown) => {
        logger.warn("account delete refused: owner email failed", { error });
        return false;
      },
    );
    if (!sent) throw new UpstreamError(DELETE_UNAVAILABLE);
  }

  return new Hono<AuthEnv>().delete("/me", deleteLimit, async (c) => {
    const userId = c.get("userId");
    await emailOwner({ userId, email: c.get("userEmail"), at: new Date(now()) });
    await deleteAccountData(db, userId);
    return ok(c, null);
  });
}
