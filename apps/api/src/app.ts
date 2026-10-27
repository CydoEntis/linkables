import { API_V1_PREFIX } from "@linkables/shared/http";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { skipNotifyOwner, type NotifyAccountDeleted, type NotifyOwner } from "./access/notify-owner";
import { accessRequestRoutes } from "./access/routes";
import { accountRoutes } from "./account/routes";
import { me } from "./auth/me";
import { collectionRoutes } from "./collections/routes";
import { exportRoutes } from "./export/routes";
import { extensionSessionRoutes } from "./extension-sessions/routes";
import type { SupabaseAdmin } from "./extension-sessions/supabase-admin";
import type { AuthConfig } from "./auth/key-source";
import { requireAuth, type AuthEnv } from "./auth/require-auth";
import type { Db } from "./db/client";
import type { Logger } from "./log/logger";
import { ok } from "./http/envelope";
import type { AppEnv } from "./http/env";
import { notFound, onError } from "./http/error-handler";
import { REQUEST_ID_HEADER, requestId } from "./http/request-id";
import { requestLog } from "./http/request-log";
import { groupRoutes } from "./groups/routes";
import { linkRoutes } from "./links/routes";
import type { HtmlPage } from "./metadata/fetcher";
import { createExtractPool } from "./reader/extract-pool";
import type { ReaderDeps } from "./reader/get-reader";
import { readerRoutes } from "./reader/routes";
import { sharedRoutes, shareRoutes } from "./sharing/routes";

const MAX_BODY_BYTES = 16 * 1024;

export type AppDeps = {
  logger: Logger;
  corsOrigins: string[];
  auth: AuthConfig;
  db: Db;
  now?: () => number;
  notifyOwner?: NotifyOwner;
  // Unset when Resend is not configured; DELETE /me then answers UPSTREAM and deletes nothing.
  notifyAccountDeleted?: NotifyAccountDeleted | undefined;
  // Unset when SUPABASE_SECRET_KEY is not configured; POST /extension-sessions then answers UPSTREAM.
  supabaseAdmin?: SupabaseAdmin | undefined;
  // The SSRF-guarded whole-page fetch (metadata/fetcher.ts); tests pass a stub.
  fetchPage: (url: string) => Promise<HtmlPage>;
  extract?: ReaderDeps["extract"];
};

const PREFLIGHT_MAX_AGE_SECONDS = 2 * 60 * 60;

export function createApp({
  logger,
  corsOrigins,
  auth,
  db,
  now = Date.now,
  notifyOwner = skipNotifyOwner,
  notifyAccountDeleted,
  supabaseAdmin,
  fetchPage,
  // One pool per app, which is one per process, so concurrent reads share its bounds.
  extract = createExtractPool({ logger }).extract,
}: AppDeps) {
  const behindProxy = auth.nodeEnv === "production";
  const v1 = new Hono<AuthEnv>()
    // Over the cap, bodyLimit throws a 413 HTTPException, which onError maps to VALIDATION.
    .use(bodyLimit({ maxSize: MAX_BODY_BYTES }))
    .use(requireAuth(auth, logger))
    .route("/", me)
    .route("/", accountRoutes({ db, logger, now, notifyAccountDeleted }))
    .route("/", extensionSessionRoutes({ logger, now, supabaseAdmin }))
    .route("/", linkRoutes({ db, now }))
    .route("/", readerRoutes({ db, fetchPage, extract, logger, now }))
    .route("/", collectionRoutes({ db }))
    .route("/", groupRoutes({ db }))
    .route("/", exportRoutes({ db, now }))
    .route("/", shareRoutes({ db }));

  const app = new Hono<AppEnv>()
    .use(requestLog(logger))
    .use(requestId)
    // CORS runs before auth so preflights never reach the token check.
    // Chrome drops a keepalive request (the web app's save as a page unloads) that
    // still needs a preflight, so browsers keep one for 2 h, Chrome's cap.
    .use(cors({ origin: corsOrigins, exposeHeaders: [REQUEST_ID_HEADER], maxAge: PREFLIGHT_MAX_AGE_SECONDS }))
    .get("/health", (c) => ok(c, { status: "ok" as const }))
    // Mounted before v1, so a request it answers never reaches v1's auth middleware.
    .route(API_V1_PREFIX, accessRequestRoutes({ db, logger, now, notifyOwner, behindProxy }))
    .route(API_V1_PREFIX, sharedRoutes({ db, logger, now, behindProxy }))
    .route(API_V1_PREFIX, v1);

  app.onError(onError(logger));
  app.notFound(notFound);
  return app;
}
