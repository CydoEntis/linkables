import { FETCH_STATUSES, RESOURCE_KINDS } from "@linkables/shared/links";
import { readerArticleSchema, READER_STATUSES } from "@linkables/shared/reader";
import { z } from "zod";

const id = z.uuid();
const nullableText = z.string().nullable();
const httpUrl = z.url().refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Expected an HTTP(S) URL");

// Date alone rounds away PostgreSQL microseconds, which are pagination keys.
export function normalizedTimestamp(value: string): string {
  const iso = new Date(value).toISOString();
  const fraction = /\.(\d+)(?:Z|[+-]\d\d(?::?\d\d)?)$/.exec(value)?.[1] ?? "";
  return iso.slice(0, 19) + "." + fraction.padEnd(6, "0").slice(0, 6) + "Z";
}

const timestamp = z.string().refine((value) => Number.isFinite(Date.parse(value)), "Invalid timestamp").transform(normalizedTimestamp);
const email = z.email().transform((value) => value.toLowerCase());

const resource = z.strictObject({
  id, canonical_url: httpUrl, final_url: nullableText, rel_canonical_url: nullableText,
  title: nullableText, description: nullableText, author: nullableText, favicon_url: nullableText,
  thumbnail_url: nullableText, content_type: nullableText, kind: z.enum(RESOURCE_KINDS).nullable(),
  fetch_status: z.enum(FETCH_STATUSES), fetch_error: nullableText, fetched_at: timestamp.nullable(), created_at: timestamp,
});
const savedLink = z.strictObject({
  id, user_id: id, resource_id: id, original_url: httpUrl, title_override: nullableText, note: nullableText,
  pinned: z.boolean(), saved_at: timestamp, saved_from: nullableText,
});
const collection = z.strictObject({
  id, user_id: id, name: z.string(), pinned: z.boolean(), created_at: timestamp, last_used_at: timestamp,
  share_token: nullableText, share_ungrouped: z.boolean(), share_private: z.boolean(),
});
const group = z.strictObject({
  id, collection_id: id, name: z.string(), position: z.number().int().nonnegative(), shared: z.boolean(), created_at: timestamp,
});
const item = z.strictObject({ collection_id: id, saved_link_id: id, group_id: id.nullable(), created_at: timestamp });
const reader = z.strictObject({
  resource_id: id, status: z.enum(READER_STATUSES), article: readerArticleSchema.nullable(), reason: nullableText, fetched_at: timestamp,
}).refine((row) => (row.status === "ok") === (row.article !== null), "Invalid reader status");
const job = z.strictObject({
  id: z.union([z.number().int().positive(), z.string().regex(/^\d+$/).transform(Number)]).pipe(z.number().int().positive().max(Number.MAX_SAFE_INTEGER)),
  resource_id: id, run_after: timestamp, locked_until: timestamp.nullable(), attempts: z.number().int().nonnegative(),
  last_error: nullableText, created_at: timestamp,
});
const access = z.strictObject({ id, email, name: nullableText, use_case: nullableText, user_agent: nullableText, created_at: timestamp });
const allowedEmail = z.strictObject({ collection_id: id, email, created_at: timestamp });

export const snapshotSchema = z.strictObject({
  format: z.literal("linkables-postgres-snapshot"), version: z.literal(1), exportedAt: timestamp,
  users: z.array(z.strictObject({ id, email, name: z.string().min(1), created_at: timestamp })),
  tables: z.strictObject({
    resource: z.array(resource), saved_link: z.array(savedLink), collection: z.array(collection),
    collection_group: z.array(group), collection_item: z.array(item), resource_reader: z.array(reader),
    job: z.array(job), access_request: z.array(access), share_allowed_email: z.array(allowedEmail),
    // Authentication artifacts intentionally have no meaning on a new instance.
    share_code: z.array(z.unknown()), share_viewer_session: z.array(z.unknown()),
  }),
});

export type Snapshot = z.infer<typeof snapshotSchema>;
export const SNAPSHOT_TABLES = [
  "resource", "saved_link", "collection", "collection_group", "collection_item", "resource_reader",
  "job", "access_request", "share_allowed_email", "share_code", "share_viewer_session",
] as const;
