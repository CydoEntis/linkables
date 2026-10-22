import { z } from "zod";
import {
  FETCH_STATUSES,
  LINK_VIEWS,
  LIST_LIMIT_DEFAULT,
  LIST_LIMIT_MAX,
  NOTE_MAX,
  RESOURCE_KINDS,
  SEARCH_QUERY_MAX_LENGTH,
  TITLE_MAX,
  UNSAFE_TEXT_CHARS,
  URL_MAX_LENGTH,
} from "./constants";

export const saveLinkRequestSchema = z.object({
  url: z.string().trim().max(URL_MAX_LENGTH, { error: `url must be at most ${String(URL_MAX_LENGTH)} characters` }),
  collectionId: z.uuid().optional(),
});

export const resourceSummarySchema = z.strictObject({
  id: z.uuid(),
  canonicalUrl: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  author: z.string().nullable(),
  faviconUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  kind: z.enum(RESOURCE_KINDS).nullable(),
  fetchStatus: z.enum(FETCH_STATUSES),
});

export const savedLinkSchema = z.strictObject({
  id: z.uuid(),
  originalUrl: z.string(),
  titleOverride: z.string().nullable(),
  note: z.string().nullable(),
  pinned: z.boolean(),
  savedAt: z.iso.datetime(),
  resource: resourceSummarySchema,
});

// duplicate: the user had already saved this resource; the existing link is returned.
export const saveLinkResponseSchema = savedLinkSchema.extend({ duplicate: z.boolean() });

// Postgres rejects NUL in text, and no other control character belongs in a
// search box. Tab is allowed because pasted text often carries one.
function hasControlCharacter(text: string): boolean {
  return /\p{Cc}/u.test(text.replaceAll("\t", ""));
}

// The Inbox is links in no collection, so it cannot be narrowed to one.
export const listLinksQuerySchema = z
  .object({
    view: z.enum(LINK_VIEWS).default("all"),
    cursor: z.string().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
    collectionId: z.uuid().optional(),
    // A blank search is no search, so clients can send the box's value as-is.
    q: z
      .string()
      .trim()
      .max(SEARCH_QUERY_MAX_LENGTH)
      .refine((q) => !hasControlCharacter(q), { error: "q must not contain control characters" })
      .transform((q) => q || undefined)
      .optional(),
  })
  .refine((query) => !(query.view === "inbox" && query.collectionId !== undefined), {
    error: "view=inbox cannot be combined with collectionId",
    path: ["collectionId"],
  });

// cursor: pass back to get the next page; null on the last page.
export const listLinksResponseSchema = z.strictObject({
  items: z.array(savedLinkSchema),
  cursor: z.string().nullable(),
});

// Titles are one line, like fetched titles; notes keep their line breaks.
const collapseWhitespace = (text: string) => text.replace(/\s+/g, " ");
const keepWhitespace = (text: string) => text;

// A blank value clears the field, so emptying the title input restores the fetched title.
function clearableText(field: string, max: number, normalize: (text: string) => string) {
  return z
    .string()
    .transform((text) => normalize(text).trim())
    .pipe(
      z
        .string()
        .max(max, { error: `${field} must be at most ${String(max)} characters` })
        .refine((text) => !UNSAFE_TEXT_CHARS.test(text), { error: `${field} contains characters that are not allowed` }),
    )
    .transform((text) => (text === "" ? null : text))
    .nullable();
}

export const updateLinkRequestSchema = z
  .strictObject({
    titleOverride: clearableText("titleOverride", TITLE_MAX, collapseWhitespace).optional(),
    note: clearableText("note", NOTE_MAX, keepWhitespace).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { error: "Send at least one of titleOverride, note or pinned" });
