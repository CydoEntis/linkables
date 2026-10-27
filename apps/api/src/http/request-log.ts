import { API_V1_PREFIX } from "@linkables/shared/http";
import { createMiddleware } from "hono/factory";
import type { Logger } from "../log/logger";
import type { AppEnv } from "./env";

const SHARED_TOKEN = new RegExp(`^(${API_V1_PREFIX}/shared/)[^/]+`);

// A shared collection's token is the only thing guarding it, so it never reaches the logs.
export function loggedPath(path: string): string {
  return path.replace(SHARED_TOKEN, "$1:token");
}

export function requestLog(logger: Logger) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const startedAt = performance.now();
    await next();
    logger.info("request", {
      method: c.req.method,
      path: loggedPath(c.req.path),
      status: c.res.status,
      ms: Math.round(performance.now() - startedAt),
      requestId: c.get("requestId"),
    });
  });
}
