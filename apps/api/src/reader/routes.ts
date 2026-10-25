import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import type { AuthEnv } from "../auth/require-auth";
import { ok } from "../http/envelope";
import { RateLimitError } from "../http/errors";
import { parseWith } from "../http/validate";
import { windowCounter } from "../http/window-counter";
import { getReader, type ReaderDeps } from "./get-reader";

// Counts only fetches: a cached copy costs one query, a fetch ties up the API for up to 10 s.
const FETCHES_PER_MINUTE = 10;
// Keys are signed-in users, so this only guards memory; no beta comes close.
const READERS_TRACKED = 100_000;

const linkParamSchema = z.object({ id: z.uuid() });

export function readerRoutes(deps: ReaderDeps) {
  // shortcut: in process memory like rateLimit (http/rate-limit.ts); fine for one container.
  const fetches = windowCounter({ limit: FETCHES_PER_MINUTE, windowMs: 60_000, maxKeys: READERS_TRACKED, now: deps.now });

  return new Hono<AuthEnv>().get(
    "/links/:id/reader",
    validator("param", parseWith(linkParamSchema, "Invalid link id")),
    async (c) => {
      const userId = c.get("userId");
      const beforeFetch = () => {
        const hit = fetches.hit(userId);
        if (hit.ok) return;
        c.header("Retry-After", String(Math.ceil(hit.retryAfterMs / 1000)));
        throw new RateLimitError("Too many pages opened in the reader, try again shortly");
      };
      return ok(c, await getReader(deps, { userId, linkId: c.req.valid("param").id, beforeFetch }));
    },
  );
}
