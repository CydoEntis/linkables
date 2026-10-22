import { API_V1_PREFIX } from "@linkaroo/shared/http";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { me } from "./auth/me";
import { collectionRoutes } from "./collections/routes";
import type { AuthConfig } from "./auth/key-source";
import { requireAuth, type AuthEnv } from "./auth/require-auth";
import type { Db } from "./db/client";
import type { Logger } from "./log/logger";
import { ok } from "./http/envelope";
import type { AppEnv } from "./http/env";
import { notFound, onError } from "./http/error-handler";
import { REQUEST_ID_HEADER, requestId } from "./http/request-id";
import { requestLog } from "./http/request-log";
import { linkRoutes } from "./links/routes";

const MAX_BODY_BYTES = 16 * 1024;

export type AppDeps = {
  logger: Logger;
  corsOrigins: string[];
  auth: AuthConfig;
  db: Db;
  now?: () => number;
};

export function createApp({ logger, corsOrigins, auth, db, now = Date.now }: AppDeps) {
  const v1 = new Hono<AuthEnv>()
    // Over the cap, bodyLimit throws a 413 HTTPException, which onError maps to VALIDATION.
    .use(bodyLimit({ maxSize: MAX_BODY_BYTES }))
    .use(requireAuth(auth, logger))
    .route("/", me)
    .route("/", linkRoutes({ db, now }))
    .route("/", collectionRoutes({ db }));

  const app = new Hono<AppEnv>()
    .use(requestLog(logger))
    .use(requestId)
    // CORS runs before auth so preflights never reach the token check.
    .use(cors({ origin: corsOrigins, exposeHeaders: [REQUEST_ID_HEADER] }))
    .get("/health", (c) => ok(c, { status: "ok" as const }))
    .route(API_V1_PREFIX, v1);

  app.onError(onError(logger));
  app.notFound(notFound);
  return app;
}
