import {
  bigserial,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
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
import { READER_STATUSES, type ReaderArticle } from "@linkables/shared/reader";

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
    // Null while the view-only link is off; turning it on again issues a new one.
    shareToken: text("share_token").unique(),
  },
  (table) => [uniqueIndex("collection_user_id_lower_name_unique").on(table.userId, sql`lower(${table.name})`)],
).enableRLS();

// One level of named headings inside a collection. position is a dense 0-based
// order that a reorder rewrites; shared is read by the sharing work that follows.
export const collectionGroup = pgTable(
  "collection_group",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collection.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    shared: boolean("shared").notNull().default(true),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("collection_group_collection_id_lower_name_unique").on(table.collectionId, sql`lower(${table.name})`),
    unique("collection_group_collection_id_id_unique").on(table.collectionId, table.id),
  ],
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
    // Null is ungrouped. The composite key below keeps a link in a group of its own collection.
    groupId: uuid("group_id"),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.collectionId, table.savedLinkId] }),
    // The migration narrows ON DELETE SET NULL to group_id, which drizzle cannot express;
    // without that, deleting a group would try to null collection_id too.
    foreignKey({
      name: "collection_item_group_fk",
      columns: [table.collectionId, table.groupId],
      foreignColumns: [collectionGroup.collectionId, collectionGroup.id],
    }).onDelete("set null"),
    index("collection_item_saved_link_id_idx").on(table.savedLinkId),
  ],
).enableRLS();

export const readerStatus = pgEnum("reader_status", READER_STATUSES);

// One readable copy per resource: the page is the same for everyone who saved it.
// reason is a short code for an unavailable copy, never a fetch error message.
export const resourceReader = pgTable(
  "resource_reader",
  {
    resourceId: uuid("resource_id")
      .primaryKey()
      .references(() => resource.id, { onDelete: "cascade" }),
    status: readerStatus("status").notNull(),
    article: jsonb("article").$type<ReaderArticle>(),
    reason: text("reason"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("resource_reader_article_when_ok", sql`(${table.status} = 'ok') = (${table.article} is not null)`)],
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

// Insert-only from the public request-access form; nothing in the API reads it back.
export const accessRequest = pgTable(
  "access_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name"),
    useCase: text("use_case"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (table) => [check("access_request_email_lowercase", sql`${table.email} = lower(${table.email})`)],
).enableRLS();
