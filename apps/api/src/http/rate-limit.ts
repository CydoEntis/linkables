import type { Context, Env } from "hono";
import { createMiddleware } from "hono/factory";
import type { Logger } from "../log/logger";
import { RateLimitError } from "./errors";
import { windowCounter, type WindowCounterOptions } from "./window-counter";

// When the limiter is full, callers are refused for reasons that are not their
// own, so they get a neutral message and the operator gets one warning per window.
export type WhenFull = { message: string; logger: Logger; name: string };

export type RateLimitOptions<E extends Env> = WindowCounterOptions & {
  key: (c: Context<E>) => string;
  message: string;
  whenFull?: WhenFull;
};

// shortcut: counts live in process memory (window-counter.ts), so they reset on
// restart and are not shared across instances. Memory is bounded by maxKeys.
// Fine for the single container in ADR-0005; move to Postgres or Redis before scaling out.
export function rateLimit<E extends Env>({ key, message, whenFull, ...options }: RateLimitOptions<E>) {
  const windows = windowCounter(options);
  let warnedAt: number | undefined;

  function fullMessage(): string {
    if (whenFull === undefined) return message;
    const at = options.now();
    if (warnedAt === undefined || at - warnedAt >= options.windowMs) {
      warnedAt = at;
      whenFull.logger.warn("rate limiter full, refusing new callers", { limiter: whenFull.name, maxKeys: options.maxKeys });
    }
    return whenFull.message;
  }

  return createMiddleware<E>(async (c, next) => {
    const result = windows.hit(key(c));
    if (!result.ok) {
      c.header("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
      throw new RateLimitError(result.full ? fullMessage() : message);
    }
    await next();
  });
}
