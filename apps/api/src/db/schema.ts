import {
  bigserial,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { FETCH_STATUSES, RESOURCE_KINDS, type LinkSource } from "@linkables/shared/links";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const resourceKind = pgEnum("resource_kind", RESOURCE_KINDS);

export const fetchStatus = pgEnum("fetch_status", FETCH_STATUSES);

export const resource = pgTable("resource", {
  id: uuid("id").primaryKey().defaultRandom(),
  canonicalUrl: text("canonical_url").notNull().unique(),
  finalUrl: text("final_url"),
  relCanonicalUrl: text("rel_canonical_url"),
  title: text("title"),
  description: text("description"),
  author: text("author"),
  faviconUrl: text("favicon_url"),
  thumbnailUrl: text("thumbnail_url"),
  contentType: text("content_type"),
  kind: resourceKind("kind"),
  fetchStatus: fetchStatus("fetch_status").notNull().default("pending"),
  fetchError: text("fetch_error"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
  createdAt: createdAt(),
}).enableRLS();

export const savedLink = pgTable(
  "saved_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => resource.id),
    originalUrl: text("original_url").notNull(),
    titleOverride: text("title_override"),
    note: text("note"),
    pinned: boolean("pinned").notNull().default(false),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
    savedFrom: text("saved_from").$type<LinkSource>(),
  },
  (table) => [unique().on(table.userId, table.resourceId)],
).enableRLS();

export const collection = pgTable(
  "collection",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: createdAt(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("collection_user_id_lower_name_unique").on(table.userId, sql`lower(${table.name})`)],
).enableRLS();

export const collectionItem = pgTable(
  "collection_item",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    savedLinkId: uuid("saved_link_id")
      .notNull()
      .references(() => savedLink.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.savedLinkId] }),
    index("collection_item_saved_link_id_idx").on(table.savedLinkId),
  ],
).enableRLS();

export const job = pgTable("job", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  resourceId: uuid("resource_id")
    .notNull()
    .references(() => resource.id, { onDelete: "cascade" }),
  runAfter: timestamp("run_after", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: createdAt(),
}).enableRLS();
