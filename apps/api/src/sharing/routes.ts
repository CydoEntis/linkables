import {
  shareAccessSchema,
  shareScopeRequestSchema,
  shareTokenSchema,
  viewerCodeRequestSchema,
  VIEWER_SESSION_HEADER,
  viewerSessionSchema,
  viewerVerifyRequestSchema,
} from "@linkables/shared/sharing";
import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { validator } from "hono/validator";
import { z } from "zod";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { clientKey } from "../http/client-ip";
import { ok } from "../http/envelope";
import type { AppEnv } from "../http/env";
import { NotFoundError, RateLimitError } from "../http/errors";
import { rateLimit } from "../http/rate-limit";
import { parseWith } from "../http/validate";
import { windowCounter } from "../http/window-counter";
import type { Logger } from "../log/logger";
import { getShareAccess, requestViewerCode, setShareAccess, verifyViewerCode } from "./private-share";
import { skipSendViewerCode, type SendViewerCode } from "./send-viewer-code";
import { disableShare, enableShare, getShareState, listOwnShared, setShareScope, sharedCollection } from "./share";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
// A viewer loads the page once; this leaves room for a household behind one address.
const VIEWS_PER_MINUTE = 60;
const ADDRESSES_TRACKED = 10_000;
const MAX_BODY_BYTES = 4 * 1024;
// Asking for codes is what can fill a stranger's inbox, so it is the tightest: a few per
// address on one link, a few per network address, and a cap on all the mail we send.
const CODE_REQUESTS_PER_HOUR_PER_NETWORK = 10;
const CODE_REQUESTS_PER_QUARTER_HOUR_PER_ADDRESS = 3;
const CODE_MAILS_PER_HOUR = 300;
const VERIFIES_PER_HOUR_PER_NETWORK = 30;
const VERIFIES_PER_QUARTER_HOUR_PER_ADDRESS = 10;
const QUARTER_HOUR_MS = 15 * MINUTE_MS;
const TOO_MANY = "Too many requests, try again later";

const collectionParams = validator("param", parseWith(z.object({ id: z.uuid() }), "Invalid path"));

const scopeBody = validator("json", parseWith(shareScopeRequestSchema, "Invalid request body"));

const accessBody = validator("json", parseWith(shareAccessSchema, "Invalid request body"));

// A malformed token can never match, so it gets the same NOT_FOUND as an unknown one.
const tokenParams = validator("param", (value) => {
  const parsed = z.object({ token: shareTokenSchema }).safeParse(value);
  if (!parsed.success) throw new NotFoundError("Shared collection not found");
  return parsed.data;
});

export function shareRoutes({ db, canSendMail }: { db: Db; canSendMail: boolean }) {
  return new Hono<AuthEnv>()
    .get("/collections/shared", async (c) => ok(c, await listOwnShared(db, c.get("userId"))))
    .get("/collections/:id/share", collectionParams, async (c) =>
      ok(c, await getShareState(db, { userId: c.get("userId"), id: c.req.valid("param").id })),
    )
    .post("/collections/:id/share", collectionParams, async (c) =>
      ok(c, await enableShare(db, { userId: c.get("userId"), id: c.req.valid("param").id })),
    )
    .delete("/collections/:id/share", collectionParams, async (c) =>
      ok(c, await disableShare(db, { userId: c.get("userId"), id: c.req.valid("param").id })),
    )
    .put("/collections/:id/share/scope", collectionParams, scopeBody, async (c) =>
      ok(c, await setShareScope(db, { userId: c.get("userId"), id: c.req.valid("param").id }, c.req.valid("json"))),
    )
    .get("/collections/:id/share/access", collectionParams, async (c) =>
      ok(c, await getShareAccess(db, { userId: c.get("userId"), id: c.req.valid("param").id })),
    )
    .put("/collections/:id/share/access", collectionParams, accessBody, async (c) =>
      ok(c, await setShareAccess(db, canSendMail, { userId: c.get("userId"), id: c.req.valid("param").id }, c.req.valid("json"))),
    );
}

export type SharedRoutesDeps = {
  db: Db;
  logger: Logger;
  now: () => number;
  behindProxy: boolean;
  // Unset when Resend is not configured: a private share cannot be turned on, and no code goes out.
  sendViewerCode: SendViewerCode | undefined;
};

function perNetwork(deps: SharedRoutesDeps, what: string, limit: number) {
  return rateLimit<AppEnv>({
    limit,
    windowMs: HOUR_MS,
    maxKeys: ADDRESSES_TRACKED,
    now: deps.now,
    key: clientKey(deps.logger, deps.behindProxy, what),
    message: TOO_MANY,
    whenFull: { message: "Shared collections are busy. Try again in a minute.", logger: deps.logger, name: what },
  });
}

// Counts every try on one link and email address, listed or not, so being refused says nothing about the list.
function perAddress({ now }: SharedRoutesDeps, limit: number) {
  const tries = windowCounter({ limit, windowMs: QUARTER_HOUR_MS, maxKeys: ADDRESSES_TRACKED, now });
  return (c: Context<AppEnv>, token: string, email: string): void => {
    const hit = tries.hit(`${token}\n${email}`);
    if (hit.ok) return;
    c.header("Retry-After", String(Math.ceil(hit.retryAfterMs / 1000)));
    throw new RateLimitError(TOO_MANY);
  };
}

// Past the hourly cap the mail is dropped and the viewer is answered as usual, so the cap cannot be probed.
function withinMailBudget(send: SendViewerCode, { logger, now }: SharedRoutesDeps): SendViewerCode {
  const budget = windowCounter({ limit: CODE_MAILS_PER_HOUR, windowMs: HOUR_MS, maxKeys: 1, now });
  return (message) => {
    if (budget.hit("mail").ok) return send(message);
    logger.warn("viewer code email skipped, hourly cap reached");
    return Promise.resolve();
  };
}

const sessionHeader = viewerSessionSchema.shape.session;

// Public: anyone holding a token the owner turned on may read that one
// collection's display fields (Rule 3). Nothing else is reachable through it.
// When the owner limited the share to listed emails, the read also needs the session a
// listed address earns by entering the code mailed to it; the two POST routes below
// are how it is earned and give the same answer for every address.
export function sharedRoutes(deps: SharedRoutesDeps) {
  const { db, now } = deps;
  const send = withinMailBudget(deps.sendViewerCode ?? skipSendViewerCode, deps);
  const viewer = { ...deps, send };
  const codeTries = perAddress(deps, CODE_REQUESTS_PER_QUARTER_HOUR_PER_ADDRESS);
  const verifyTries = perAddress(deps, VERIFIES_PER_QUARTER_HOUR_PER_ADDRESS);
  return new Hono<AppEnv>()
    .get(
      "/shared/:token",
      rateLimit<AppEnv>({
        limit: VIEWS_PER_MINUTE,
        windowMs: MINUTE_MS,
        maxKeys: ADDRESSES_TRACKED,
        now,
        key: clientKey(deps.logger, deps.behindProxy, "shared collection view"),
        message: TOO_MANY,
        whenFull: { message: "Shared collections are busy. Try again in a minute.", logger: deps.logger, name: "shared-view" },
      }),
      tokenParams,
      async (c) => {
        const session = sessionHeader.safeParse(c.req.header(VIEWER_SESSION_HEADER)).data;
        return ok(c, await sharedCollection(db, c.req.valid("param").token, { session, now: now() }));
      },
    )
    .post(
      "/shared/:token/code",
      bodyLimit({ maxSize: MAX_BODY_BYTES }),
      perNetwork(deps, "viewer code request", CODE_REQUESTS_PER_HOUR_PER_NETWORK),
      tokenParams,
      validator("json", parseWith(viewerCodeRequestSchema, "Invalid request body")),
      async (c) => {
        const { token } = c.req.valid("param");
        const { email } = c.req.valid("json");
        codeTries(c, token, email);
        await requestViewerCode(viewer, token, email);
        return ok(c, null);
      },
    )
    .post(
      "/shared/:token/verify",
      bodyLimit({ maxSize: MAX_BODY_BYTES }),
      perNetwork(deps, "viewer code check", VERIFIES_PER_HOUR_PER_NETWORK),
      tokenParams,
      validator("json", parseWith(viewerVerifyRequestSchema, "Invalid request body")),
      async (c) => {
        const { token } = c.req.valid("param");
        const { email, code } = c.req.valid("json");
        verifyTries(c, token, email);
        return ok(c, await verifyViewerCode(viewer, token, email, code));
      },
    );
}
