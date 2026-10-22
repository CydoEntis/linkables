import { HTTP_STATUS } from "@linkaroo/shared/http";
import {
  listLinksQuerySchema,
  saveLinkRequestSchema,
  updateLinkRequestSchema,
  URL_MAX_LENGTH,
} from "@linkaroo/shared/links";
import { canonicalize } from "@linkaroo/shared/url";
import { Hono } from "hono";
import { validator } from "hono/validator";
import type { AuthEnv } from "../auth/require-auth";
import type { Db } from "../db/client";
import { ok } from "../http/envelope";
import { ValidationError } from "../http/errors";
import { parseWith } from "../http/validate";
import { decodeCursor } from "./cursor";
import { deleteLink } from "./delete-link";
import { listLinks } from "./list-links";
import { rateLimitPerUser } from "./rate-limit";
import { saveLink } from "./save-link";
import { updateLink } from "./update-link";

const SAVES_PER_MINUTE = 60;

const CANONICALIZE_ERRORS = {
  invalid_url: "url must be a valid URL",
  unsupported_protocol: "url must start with http:// or https://",
} as const;

function invalid(field: string, message: string): ValidationError {
  return new ValidationError(message, { fieldErrors: { [field]: message } });
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

const linkParamSchema = z.object({ id: z.uuid() });

export type LinkRoutesDeps = { db: Db; now: () => number };

export function linkRoutes({ db, now }: LinkRoutesDeps) {
  return new Hono<AuthEnv>()
    .get("/links", validator("query", parseWith(listLinksQuerySchema, "Invalid query")), async (c) => {
      const { view, limit, cursor, collectionId, q } = c.req.valid("query");
      const page = await listLinks(db, {
        userId: c.get("userId"),
        view,
        limit,
        cursor: cursor === undefined ? undefined : decodeCursor(cursor),
        collectionId,
        q,
      });
      return ok(c, page);
    })
    .post(
      "/links",
      rateLimitPerUser({ limit: SAVES_PER_MINUTE, windowMs: 60_000, now }),
      validator("json", parseWith(saveLinkRequestSchema, "Invalid request body")),
      async (c) => {
        const { url, collectionId } = c.req.valid("json");
        const canonicalUrl = canonicalUrlFor(url);
        const saved = await saveLink(db, { userId: c.get("userId"), originalUrl: url, canonicalUrl, collectionId });
        return ok(c, saved, saved.duplicate ? HTTP_STATUS.OK : HTTP_STATUS.CREATED);
      },
    )
    .patch(
      "/links/:id",
      validator("param", parseWith(linkParamSchema, "Invalid link id")),
      validator("json", parseWith(updateLinkRequestSchema, "Invalid request body")),
      async (c) => {
        const link = await updateLink(db, {
          userId: c.get("userId"),
          linkId: c.req.valid("param").id,
          changes: c.req.valid("json"),
        });
        return ok(c, link);
      },
    )
    .delete("/links/:id", validator("param", parseWith(linkParamSchema, "Invalid link id")), async (c) => {
      await deleteLink(db, { userId: c.get("userId"), linkId: c.req.valid("param").id });
      return ok(c, null);
    });
}
