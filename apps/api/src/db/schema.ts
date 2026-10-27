import { randomUUID } from "node:crypto";
import { customType, index, integer, primaryKey, sqliteTable, text, unique, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { FETCH_STATUSES, RESOURCE_KINDS, type LinkSource } from "@linkables/shared/links";

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
const id = () => text("id").primaryKey().$defaultFn(randomUUID);

export const resource = sqliteTable("resource", {
  id: id(),
  canonicalUrl: text("canonical_url").notNull().unique(),
  finalUrl: text("final_url"),
  relCanonicalUrl: text("rel_canonical_url"),
  title: text("title"), description: text("description"), author: text("author"),
  faviconUrl: text("favicon_url"), thumbnailUrl: text("thumbnail_url"), contentType: text("content_type"),
  kind: text("kind", { enum: RESOURCE_KINDS }),
  fetchStatus: text("fetch_status", { enum: FETCH_STATUSES }).notNull().default("pending"),
  fetchError: text("fetch_error"), fetchedAt: timestamp("fetched_at"), createdAt: createdAt(),
});

export const savedLink = sqliteTable("saved_link", {
  id: id(), userId: text("user_id").notNull(),
  resourceId: text("resource_id").notNull().references(() => resource.id),
  originalUrl: text("original_url").notNull(), titleOverride: text("title_override"), note: text("note"),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  savedAt: timestamp("saved_at").notNull().default(databaseNow),
  savedFrom: text("saved_from").$type<LinkSource>(),
}, (table) => [unique().on(table.userId, table.resourceId), index("saved_link_user_id_idx").on(table.userId)]);

export const collection = sqliteTable("collection", {
  id: id(), userId: text("user_id").notNull(), name: text("name").notNull(),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false), createdAt: createdAt(),
  lastUsedAt: timestamp("last_used_at").notNull().default(databaseNow),
}, (table) => [uniqueIndex("collection_user_id_lower_name_unique").on(table.userId, sql`lower(${table.name})`)]);

export const collectionItem = sqliteTable("collection_item", {
  collectionId: text("collection_id").notNull().references(() => collection.id, { onDelete: "cascade" }),
  savedLinkId: text("saved_link_id").notNull().references(() => savedLink.id, { onDelete: "cascade" }),
  createdAt: createdAt(),
}, (table) => [primaryKey({ columns: [table.collectionId, table.savedLinkId] }), index("collection_item_saved_link_id_idx").on(table.savedLinkId)]);

export const job = sqliteTable("job", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  resourceId: text("resource_id").notNull().references(() => resource.id, { onDelete: "cascade" }),
  runAfter: timestamp("run_after").notNull().default(databaseNow), lockedUntil: timestamp("locked_until"),
  leaseToken: text("lease_token"), attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"), createdAt: createdAt(),
});
