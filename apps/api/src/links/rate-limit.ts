import { createMiddleware } from "hono/factory";
import type { AuthEnv } from "../auth/require-auth";
import { RateLimitError } from "../http/errors";

type Window = { startedAt: number; count: number };

export type RateLimitOptions = { limit: number; windowMs: number; now: () => number };

// shortcut: fixed windows held in process memory. Counts reset on restart, are
// not shared across instances, and an idle user's entry is never evicted. Fine
// for the single container in ADR-0005; move to Postgres or Redis before scaling out.
export function rateLimitPerUser({ limit, windowMs, now }: RateLimitOptions) {
  const windows = new Map<string, Window>();
  return createMiddleware<AuthEnv>(async (c, next) => {
    const userId = c.get("userId");
    const at = now();
    const current = windows.get(userId);
    if (current === undefined || at - current.startedAt >= windowMs) {
      windows.set(userId, { startedAt: at, count: 1 });
    } else if (current.count < limit) {
      current.count += 1;
    } else {
      c.header("Retry-After", String(Math.ceil((current.startedAt + windowMs - at) / 1000)));
      throw new RateLimitError("Too many saves, try again shortly");
    }
    await next();
  });
}
