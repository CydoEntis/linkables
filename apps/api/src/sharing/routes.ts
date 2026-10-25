import { shareTokenSchema } from "@linkables/shared/sharing";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { clientKey } from "../http/client-ip";
import { ok } from "../http/envelope";
import type { AppEnv } from "../http/env";
import { NotFoundError } from "../http/errors";
import { rateLimit } from "../http/rate-limit";
import { parseWith } from "../http/validate";
import type { Logger } from "../log/logger";
import { disableShare, enableShare, getShareState, sharedCollection } from "./share";

const MINUTE_MS = 60 * 1000;
// A viewer loads the page once; this leaves room for a household behind one address.
const VIEWS_PER_MINUTE = 60;
const ADDRESSES_TRACKED = 10_000;

const collectionParams = validator("param", parseWith(z.object({ id: z.uuid() }), "Invalid path"));

// A malformed token can never match, so it gets the same NOT_FOUND as an unknown one.
const tokenParams = validator("param", (value) => {
  const parsed = z.object({ token: shareTokenSchema }).safeParse(value);
  if (!parsed.success) throw new NotFoundError("Shared collection not found");
  return parsed.data;
});

export function shareRoutes({ db }: { db: Db }) {
  return new Hono<AuthEnv>()
    .get("/collections/:id/share", collectionParams, async (c) =>
      ok(c, await getShareState(db, { userId: c.get("userId"), id: c.req.valid("param").id })),
    )
    .post("/collections/:id/share", collectionParams, async (c) =>
      ok(c, await enableShare(db, { userId: c.get("userId"), id: c.req.valid("param").id })),
    )
    .delete("/collections/:id/share", collectionParams, async (c) =>
      ok(c, await disableShare(db, { userId: c.get("userId"), id: c.req.valid("param").id })),
    );
}

export type SharedRoutesDeps = { db: Db; logger: Logger; now: () => number; behindProxy: boolean };

// Public: anyone holding a token the owner turned on may read that one
// collection's display fields (Rule 3). Nothing else is reachable through it.
export function sharedRoutes({ db, logger, now, behindProxy }: SharedRoutesDeps) {
  return new Hono<AppEnv>().get(
    "/shared/:token",
    rateLimit<AppEnv>({
      limit: VIEWS_PER_MINUTE,
      windowMs: MINUTE_MS,
      maxKeys: ADDRESSES_TRACKED,
      now,
      key: clientKey(logger, behindProxy, "shared collection view"),
      message: "Too many requests, try again later",
      whenFull: { message: "Shared collections are busy. Try again in a minute.", logger, name: "shared-view" },
    }),
    tokenParams,
    async (c) => ok(c, await sharedCollection(db, c.req.valid("param").token)),
  );
}
