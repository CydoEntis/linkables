import type { Context, Env } from "hono";
import { createMiddleware } from "hono/factory";
import { RateLimitError } from "./errors";
import { windowCounter, type WindowCounterOptions } from "./window-counter";

export type RateLimitOptions<E extends Env> = WindowCounterOptions & {
  key: (c: Context<E>) => string;
  message: string;
};

// shortcut: counts live in process memory (window-counter.ts), so they reset on
// restart and are not shared across instances. Memory is bounded by maxKeys.
// Fine for the single container in ADR-0005; move to Postgres or Redis before scaling out.
export function rateLimit<E extends Env>({ key, message, ...options }: RateLimitOptions<E>) {
  const windows = windowCounter(options);
  return createMiddleware<E>(async (c, next) => {
    const result = windows.hit(key(c));
    if (!result.ok) {
      c.header("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
      throw new RateLimitError(message);
    }
    await next();
  });
}
