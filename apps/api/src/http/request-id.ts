import { createMiddleware } from "hono/factory";
import { z } from "zod";
import type { AppEnv } from "./env";
import { InternalError } from "./errors";

export const REQUEST_ID_HEADER = "X-Request-Id";

const uuid = z.uuid();

function resolveRequestId(incoming: string | undefined): string {
  const parsed = uuid.safeParse(incoming);
  return parsed.success ? parsed.data : crypto.randomUUID();
}

export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const id = resolveRequestId(c.req.header(REQUEST_ID_HEADER));
  c.set("requestId", id);
  c.set("startedAt", performance.now());
  c.header(REQUEST_ID_HEADER, id);
  try {
    await next();
  } catch (thrown) {
    // Hono only routes Error instances to onError; anything else would escape
    // as a bare 500 without the envelope or request id.
    if (thrown instanceof Error) throw thrown;
    // shortcut: console until the redacting logger exists.
    console.error(`[${id}] non-Error value thrown`, thrown);
    throw new InternalError("Internal server error");
  }
});
