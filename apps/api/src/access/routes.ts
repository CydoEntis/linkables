import { accessRequestSchema } from "@linkables/shared/access";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { validator } from "hono/validator";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import type { AppEnv } from "../http/env";
import { rateLimit } from "../http/rate-limit";
import { parseWith } from "../http/validate";
import type { Logger } from "../log/logger";
import type { NotifyOwner } from "./notify-owner";
import { recordAccessRequest } from "./record-request";

const REQUESTS_PER_HOUR = 5;
const MAX_BODY_BYTES = 4 * 1024;
const USER_AGENT_MAX_LENGTH = 512;

// The web container's Caddy sets X-Real-IP from the host proxy's
// X-Forwarded-For, overwriting anything the client sent, and the API has no
// published port. Without it (dev, tests) every caller shares one window.
function clientIp(c: Context<AppEnv>): string {
  return c.req.header("X-Real-IP") ?? "unknown";
}

export type AccessRequestRoutesDeps = { db: Db; logger: Logger; now: () => number; notifyOwner: NotifyOwner };

// Public: the one route besides /health that takes no token (Rule 3). It only
// inserts, and every outcome gets the same answer, so it cannot be used to read
// anything back, not even whether an address already asked.
export function accessRequestRoutes({ db, logger, now, notifyOwner }: AccessRequestRoutesDeps) {
  return new Hono<AppEnv>().post(
    "/access-requests",
    bodyLimit({ maxSize: MAX_BODY_BYTES }),
    rateLimit<AppEnv>({
      limit: REQUESTS_PER_HOUR,
      windowMs: 60 * 60 * 1000,
      now,
      key: clientIp,
      message: "Too many requests, try again later",
    }),
    validator("json", parseWith(accessRequestSchema, "Invalid request body")),
    async (c) => {
      const { email, name, useCase, website } = c.req.valid("json");
      if (website) return ok(c, null);
      const userAgent = c.req.header("User-Agent")?.slice(0, USER_AGENT_MAX_LENGTH);
      const created = await recordAccessRequest(db, logger, { email, name, useCase, userAgent });
      if (created) {
        // Not awaited: the requester's answer never waits on, or fails with, the owner's email.
        notifyOwner({ email, name, useCase, at: new Date(now()) }).catch((error: unknown) => {
          logger.warn("owner notification failed", { error });
        });
      }
      return ok(c, null);
    },
  );
}
