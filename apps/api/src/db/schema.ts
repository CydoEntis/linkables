import { randomUUID } from "node:crypto";
import { check, customType, foreignKey, index, integer, primaryKey, sqliteTable, text, unique, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { FETCH_STATUSES, RESOURCE_KINDS, type LinkSource } from "@linkables/shared/links";
import { READER_STATUSES, type ReaderArticle } from "@linkables/shared/reader";

// Fixed UTC text keeps migrated microseconds sortable without rounding through JS Date.
export function timestampText(value: string): string {
  const iso = new Date(value).toISOString();
  const fraction = /\.(\d+)(?:Z|[+-]\d\d:\d\d)$/.exec(value)?.[1] ?? "";
  return iso.slice(0, 19) + "." + fraction.padEnd(6, "0").slice(0, 6) + "Z";
}
const timestamp = customType<{ data: Date; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => timestampText(value.toISOString()),
  fromDriver: (value) => new Date(value),
});
export const databaseNow = sql`(strftime('%Y-%m-%dT%H:%M:%f000Z', 'now'))`;
const createdAt = () => timestamp("created_at").notNull().default(databaseNow);

export const resource = sqliteTable("resource", {
  id: text("id").primaryKey().$defaultFn(randomUUID),
  canonicalUrl: text("canonical_url").notNull().unique(),
  finalUrl: text("final_url"),
  relCanonicalUrl: text("rel_canonical_url"),
  title: text("title"),
  description: text("description"),
  author: text("author"),
  faviconUrl: text("favicon_url"),
  thumbnailUrl: text("thumbnail_url"),
  contentType: text("content_type"),
  kind: text("kind", { enum: RESOURCE_KINDS }),
  fetchStatus: text("fetch_status", { enum: FETCH_STATUSES }).notNull().default("pending"),
  fetchError: text("fetch_error"),
  fetchedAt: timestamp("fetched_at"),
  createdAt: createdAt(),
});

export const savedLink = sqliteTable(
  "saved_link",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id").notNull(),
    resourceId: text("resource_id")
      .notNull()
      .references(() => resource.id),
    originalUrl: text("original_url").notNull(),
    titleOverride: text("title_override"),
    titleSortKey: text("title_sort_key").notNull().default(""),
    note: text("note"),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    savedAt: timestamp("saved_at").notNull().default(databaseNow),
    savedFrom: text("saved_from").$type<LinkSource>(),
  },
  (table) => [
    unique().on(table.userId, table.resourceId),
    index("saved_link_title_order_idx").on(table.userId, sql`${table.pinned} desc`, table.titleSortKey, table.id),
  ],
);

export const collection = sqliteTable(
  "collection",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at").notNull().default(databaseNow),
    // Null while the view-only link is off; turning it on again issues a new one.
    shareToken: text("share_token").unique(),
    // Whether the shared page shows links that sit in no group; a group's own flag is collection_group.shared.
    shareUngrouped: integer("share_ungrouped", { mode: "boolean" }).notNull().default(true),
    // When true, the link opens only for the addresses in share_allowed_email. Kept while the link is off.
    sharePrivate: integer("share_private", { mode: "boolean" }).notNull().default(false),
  },
  (table) => [uniqueIndex("collection_user_id_lower_name_unique").on(table.userId, sql`lower(${table.name})`)],
);

// Lower-cased addresses the owner lets open a private share.
export const shareAllowedEmail = sqliteTable(
  "share_allowed_email",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.collectionId, table.email] })],
);

// The one-time code mailed to a listed address: salted and scrypt-hashed, never the code itself.
// A new request replaces the old row; a right answer, too many wrong ones, or expiry ends it.
export const shareCode = sqliteTable(
  "share_code",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    salt: text("salt").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (table) => [unique("share_code_collection_id_email_unique").on(table.collectionId, table.email)],
);

// What a verified viewer holds: only the SHA-256 of a 192-bit random token is stored, and the row is good for one collection.
export const shareViewerSession = sqliteTable(
  "share_viewer_session",
  {
    tokenHash: text("token_hash").primaryKey(),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("share_viewer_session_collection_id_idx").on(table.collectionId)],
);

// One level of named headings inside a collection. position is a dense 0-based
// order that a reorder rewrites; shared is read by the sharing work that follows.
export const collectionGroup = sqliteTable(
  "collection_group",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    shared: integer("shared", { mode: "boolean" }).notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("collection_group_collection_id_lower_name_unique").on(table.collectionId, sql`lower(${table.name})`),
    unique("collection_group_collection_id_id_unique").on(table.collectionId, table.id),
  ],
);

export const collectionItem = sqliteTable(
  "collection_item",
  {
    collectionId: text("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    savedLinkId: text("saved_link_id")
      .notNull()
      .references(() => savedLink.id, { onDelete: "cascade" }),
    // Null is ungrouped. The composite key below keeps a link in a group of its own collection.
    groupId: text("group_id"),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.savedLinkId] }),
    // SQLite cannot SET NULL on only group_id; the migration trigger clears it before group deletion.
    foreignKey({
      name: "collection_item_group_fk",
      columns: [table.collectionId, table.groupId],
      foreignColumns: [collectionGroup.collectionId, collectionGroup.id],
    }),
    index("collection_item_saved_link_id_idx").on(table.savedLinkId),
  ],
);

// One readable copy per resource: the page is the same for everyone who saved it.
// reason is a short code for an unavailable copy, never a fetch error message.
export const resourceReader = sqliteTable(
  "resource_reader",
  {
    resourceId: text("resource_id")
      .primaryKey()
      .references(() => resource.id, { onDelete: "cascade" }),
    status: text("status", { enum: READER_STATUSES }).notNull(),
    article: text("article", { mode: "json" }).$type<ReaderArticle>(),
    reason: text("reason"),
    fetchedAt: timestamp("fetched_at").notNull().default(databaseNow),
  },
  (table) => [check("resource_reader_article_when_ok", sql`(${table.status} = 'ok') = (${table.article} is not null)`)],
);

export const job = sqliteTable("job", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resourceId: text("resource_id")
    .notNull()
    .references(() => resource.id, { onDelete: "cascade" }),
  runAfter: timestamp("run_after").notNull().default(databaseNow),
  lockedUntil: timestamp("locked_until"),
  leaseToken: text("lease_token"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: createdAt(),
});

// Insert-only from the public request-access form; nothing in the API reads it back.
export const accessRequest = sqliteTable(
  "access_request",
  {
    id: text("id").primaryKey().$defaultFn(randomUUID),
    email: text("email").notNull().unique(),
    name: text("name"),
    useCase: text("use_case"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (table) => [check("access_request_email_lowercase", sql`${table.email} = lower(${table.email})`)],
);
