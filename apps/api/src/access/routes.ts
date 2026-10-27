import { accessRequestSchema } from "@linkables/shared/access";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { validator } from "hono/validator";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import type { AppEnv } from "../http/env";
import { clientKey } from "../http/client-ip";
import { rateLimit } from "../http/rate-limit";
import { parseWith } from "../http/validate";
import { windowCounter } from "../http/window-counter";
import type { Logger } from "../log/logger";
import type { NotifyOwner } from "./notify-owner";
import { recordAccessRequest } from "./record-request";

const HOUR_MS = 60 * 60 * 1000;
const REQUESTS_PER_HOUR = 5;
// Sign-in codes go out through the same Resend account, so a flood of requests
// must not spend its sending quota.
const NOTICES_PER_HOUR = 10;
// Each entry is a few dozen bytes, so this caps the limiter near a megabyte.
const ADDRESSES_TRACKED = 10_000;
const REQUESTS_PAUSED = "Requests are paused for a bit. Try again later.";
const MAX_BODY_BYTES = 4 * 1024;
const USER_AGENT_MAX_LENGTH = 512;

function withinBudget(notifyOwner: NotifyOwner, logger: Logger, now: () => number): NotifyOwner {
  const budget = windowCounter({ limit: NOTICES_PER_HOUR, windowMs: HOUR_MS, maxKeys: 1, now });
  let skipped = 0;
  return (notice) => {
    if (!budget.hit("owner").ok) {
      skipped += 1;
      logger.warn("owner notification skipped, hourly cap reached", { skipped });
      return Promise.resolve();
    }
    skipped = 0;
    return notifyOwner(notice);
  };
}

export type AccessRequestRoutesDeps = {
  db: Db;
  logger: Logger;
  now: () => number;
  notifyOwner: NotifyOwner;
  behindProxy: boolean;
};

// Public: the one route besides /health that takes no token (Rule 3). It only
// inserts, and every outcome gets the same answer, so it cannot be used to read
// anything back, not even whether an address already asked.
export function accessRequestRoutes({ db, logger, now, notifyOwner, behindProxy }: AccessRequestRoutesDeps) {
  const notify = withinBudget(notifyOwner, logger, now);
  return new Hono<AppEnv>().post(
    "/access-requests",
    bodyLimit({ maxSize: MAX_BODY_BYTES }),
    rateLimit<AppEnv>({
      limit: REQUESTS_PER_HOUR,
      windowMs: HOUR_MS,
      maxKeys: ADDRESSES_TRACKED,
      now,
      key: clientKey(logger, behindProxy, "access request"),
      message: "Too many requests, try again later",
      whenFull: { message: REQUESTS_PAUSED, logger, name: "access-requests" },
    }),
    validator("json", parseWith(accessRequestSchema, "Invalid request body")),
    async (c) => {
      const { email, name, useCase, hp_confirm_field: honeypot } = c.req.valid("json");
      if (honeypot) return ok(c, null);
      const userAgent = c.req.header("User-Agent")?.slice(0, USER_AGENT_MAX_LENGTH);
      const created = await recordAccessRequest(db, logger, { email, name, useCase, userAgent });
      if (created) {
        // Not awaited: the requester's answer never waits on, or fails with, the owner's email.
        notify({ email, name, useCase, at: new Date(now()) }).catch((error: unknown) => {
          logger.warn("owner notification failed", { error });
        });
      }
      return ok(c, null);
    },
  );
}
