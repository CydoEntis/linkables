import { createMiddleware } from "hono/factory";
import type { Logger } from "../log/logger";
import type { AppEnv } from "./env";

export function requestLog(logger: Logger) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const startedAt = performance.now();
    await next();
    logger.info("request", {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      ms: Math.round(performance.now() - startedAt),
      requestId: c.get("requestId"),
    });
  });
}
