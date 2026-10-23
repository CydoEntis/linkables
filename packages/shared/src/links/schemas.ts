import { z } from "zod";
import {
  FETCH_STATUSES,
  LINK_SORTS,
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
import { isDateOnly } from "./dates";

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
  // The caller's collections holding this link, ordered by name ignoring case.
  collections: z.array(z.strictObject({ id: z.uuid(), name: z.string() })),
  resource: resourceSummarySchema,
});

// duplicate: the user had already saved this resource; the existing link is returned.
export const saveLinkResponseSchema = savedLinkSchema.extend({ duplicate: z.boolean() });

// Postgres rejects NUL in text, and no other control character belongs in a
// search box. Tab is allowed because pasted text often carries one.
function hasControlCharacter(text: string): boolean {
  return /\p{Cc}/u.test(text.replaceAll("\t", ""));
}

// Postgres has no year 0, so a 0000 bound would fail the timestamptz cast with a
// 500, and it rounds past microseconds, which would shift an inclusive bound.
function savedAtBound(field: string) {
  return z
    .union([z.iso.date(), z.iso.datetime({ offset: true })], {
      error: `${field} must be a date (YYYY-MM-DD) or an ISO datetime with an offset`,
    })
    .refine((bound) => !bound.startsWith("0000-"), { error: `${field} must be after year 0` })
    .refine((bound) => !/\.\d{7,}/.test(bound), { error: `${field} must have at most 6 fractional digits` });
}

// A date bound covers its whole UTC day: from=to=2026-03-01 is that day, not empty.
function rangeIsOrdered(from: string | undefined, to: string | undefined): boolean {
  if (from === undefined || to === undefined) return true;
  const start = Date.parse(isDateOnly(from) ? `${from}T00:00:00Z` : from);
  const end = Date.parse(isDateOnly(to) ? `${to}T23:59:59.999Z` : to);
  return start <= end;
}

// The Inbox is links in no collection, so it cannot be narrowed to one.
// from and to filter on saved_at and are both inclusive. A bare date is a UTC day,
// so the web UI sends a local day as offset datetimes, not as bare dates.
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
    sort: z.enum(LINK_SORTS).default("newest"),
    kind: z.enum(RESOURCE_KINDS).optional(),
    pinned: z
      .enum(["true", "false"])
      .transform((pinned) => pinned === "true")
      .optional(),
    from: savedAtBound("from").optional(),
    to: savedAtBound("to").optional(),
  })
  .refine((query) => rangeIsOrdered(query.from, query.to), { error: "from must not be after to", path: ["to"] })
  .refine((query) => !(query.view === "inbox" && query.collectionId !== undefined), {
    error: "view=inbox cannot be combined with collectionId",
    path: ["collectionId"],
  });

// cursor: pass back to get the next page; null on the last page. A title-sort
// cursor is rejected (VALIDATION) once its link is renamed or deleted, so after an
// edit, or when a cursor is rejected, the client restarts from the first page.
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
