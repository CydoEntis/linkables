import { HTTP_STATUS } from "@linkaroo/shared/http";
import { saveLinkRequestSchema, URL_MAX_LENGTH } from "@linkaroo/shared/links";
import { canonicalize } from "@linkaroo/shared/url";
import { Hono } from "hono";
import { validator } from "hono/validator";
import { z } from "zod";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import { ValidationError } from "../http/errors";
import { rateLimitPerUser } from "./rate-limit";
import { saveLink } from "./save-link";

const SAVES_PER_MINUTE = 60;

const CANONICALIZE_ERRORS = {
  invalid_url: "url must be a valid URL",
  unsupported_protocol: "url must start with http:// or https://",
} as const;

function invalid(field: string, message: string): ValidationError {
  return new ValidationError(message, { fieldErrors: { [field]: message } });
}

function parseBody(body: unknown) {
  const parsed = saveLinkRequestSchema.safeParse(body);
  if (parsed.success) return parsed.data;
  const fieldErrors = Object.fromEntries(
    Object.entries(z.flattenError(parsed.error).fieldErrors).map(([field, messages]) => [field, messages[0]]),
  );
  throw new ValidationError("Invalid request body", { fieldErrors });
}

// The unique index on resource.canonical_url caps an entry at 2704 bytes, so the
// limit is on encoded bytes, not characters.
function canonicalUrlFor(url: string): string {
  const result = canonicalize(url);
  if (!result.ok) throw invalid("url", CANONICALIZE_ERRORS[result.reason]);
  if (Buffer.byteLength(result.url, "utf8") > URL_MAX_LENGTH) {
    throw invalid("url", `url must be at most ${String(URL_MAX_LENGTH)} bytes once normalised`);
  }
  return result.url;
}

export type LinkRoutesDeps = { db: Db; now: () => number };

export function linkRoutes({ db, now }: LinkRoutesDeps) {
  return new Hono<AuthEnv>().post(
    "/links",
    rateLimitPerUser({ limit: SAVES_PER_MINUTE, windowMs: 60_000, now }),
    validator("json", parseBody),
    async (c) => {
      const { url } = c.req.valid("json");
      const canonicalUrl = canonicalUrlFor(url);
      const saved = await saveLink(db, { userId: c.get("userId"), originalUrl: url, canonicalUrl });
      return ok(c, saved, saved.duplicate ? HTTP_STATUS.OK : HTTP_STATUS.CREATED);
    },
  );
}
