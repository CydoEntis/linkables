import type { Context, Env } from "hono";
import { createMiddleware } from "hono/factory";
import { RateLimitError } from "./errors";

type Window = { startedAt: number; count: number };

export type RateLimitOptions<E extends Env> = {
  limit: number;
  windowMs: number;
  now: () => number;
  key: (c: Context<E>) => string;
  message: string;
};

// shortcut: fixed windows held in process memory. Counts reset on restart, are
// not shared across instances, and an idle key's entry is never evicted. Fine
// for the single container in ADR-0005; move to Postgres or Redis before scaling out.
export function rateLimit<E extends Env>({ limit, windowMs, now, key, message }: RateLimitOptions<E>) {
  const windows = new Map<string, Window>();
  return createMiddleware<E>(async (c, next) => {
    const id = key(c);
    const at = now();
    const current = windows.get(id);
    if (current === undefined || at - current.startedAt >= windowMs) {
      windows.set(id, { startedAt: at, count: 1 });
    } else if (current.count < limit) {
      current.count += 1;
    } else {
      c.header("Retry-After", String(Math.ceil((current.startedAt + windowMs - at) / 1000)));
      throw new RateLimitError(message);
    }
    await next();
  });
}
