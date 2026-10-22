import { API_V1_PREFIX } from "@linkaroo/shared/http";
import { Hono } from "hono";
import { ok } from "./http/envelope";
import type { AppEnv } from "./http/env";
import { notFound, onError } from "./http/error-handler";
import { requestId } from "./http/request-id";

export function createApp() {
  const v1 = new Hono<AppEnv>();

  const app = new Hono<AppEnv>()
    .use(requestId)
    .get("/health", (c) => ok(c, { status: "ok" as const }))
    .route(API_V1_PREFIX, v1);

  app.onError(onError);
  app.notFound(notFound);
  return app;
}
