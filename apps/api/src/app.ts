import { API_V1_PREFIX } from "@linkaroo/shared/http";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Logger } from "./log/logger";
import { ok } from "./http/envelope";
import type { AppEnv } from "./http/env";
import { notFound, onError } from "./http/error-handler";
import { REQUEST_ID_HEADER, requestId } from "./http/request-id";
import { requestLog } from "./http/request-log";

export type AppDeps = {
  logger: Logger;
  corsOrigins: string[];
};

export function createApp({ logger, corsOrigins }: AppDeps) {
  const v1 = new Hono<AppEnv>();

  const app = new Hono<AppEnv>()
    .use(requestLog(logger))
    .use(requestId)
    .use(cors({ origin: corsOrigins, exposeHeaders: [REQUEST_ID_HEADER] }))
    .get("/health", (c) => ok(c, { status: "ok" as const }))
    .route(API_V1_PREFIX, v1);

  app.onError(onError(logger));
  app.notFound(notFound);
  return app;
}
