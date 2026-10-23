import { API_VERSION, HTTP_STATUS, type Meta } from "@linkables/shared/http";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { AppEnv } from "./env";
import type { ApiError } from "./errors";

function meta<E extends AppEnv>(c: Context<E>): Meta {
  return {
    requestId: c.get("requestId"),
    ms: Math.round(performance.now() - c.get("startedAt")),
    version: API_VERSION,
  };
}

export function ok<T, E extends AppEnv>(c: Context<E>, data: T, status: ContentfulStatusCode = HTTP_STATUS.OK) {
  return c.json({ ok: true as const, data, meta: meta(c) }, status);
}

export function fail(c: Context<AppEnv>, error: ApiError) {
  const { code, message, details } = error;
  return c.json({ ok: false as const, error: { code, message, details }, meta: meta(c) }, error.status);
}
