import { API_V1_PREFIX } from "@linkaroo/shared/http";
import { Hono } from "hono";
import type { Logger } from "./log/logger";
import { ok } from "./http/envelope";
import type { AppEnv } from "./http/env";
import { notFound, onError } from "./http/error-handler";
import { requestId } from "./http/request-id";
import { requestLog } from "./http/request-log";

export type AppDeps = {
  logger: Logger;
};

export function createApp({ logger }: AppDeps) {
  const v1 = new Hono<AppEnv>();

  const app = new Hono<AppEnv>()
    .use(requestLog(logger))
    .use(requestId)
    .get("/health", (c) => ok(c, { status: "ok" as const }))
    .route(API_V1_PREFIX, v1);

  app.onError(onError(logger));
  app.notFound(notFound);
  return app;
}
