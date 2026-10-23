import {
  COLLECTION_COVER_SIZE,
  type Collection,
  type CoverTile,
  type ListCollectionsResponse,
  type ListedCollection,
  type UpdateCollectionRequest,
} from "@linkables/shared/collections";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { DrizzleQueryError } from "drizzle-orm/errors";
import postgres from "postgres";
import type { Db, Tx } from "../db/client";
import { collection, collectionItem, resource, savedLink } from "../db/schema";
import { ConflictError, NotFoundError } from "../http/errors";

type CollectionRow = typeof collection.$inferSelect;
type Owned = { userId: string; id: string };

const UNIQUE_VIOLATION = "23505";

function toCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    name: row.name,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    lastUsedAt: row.lastUsedAt.toISOString(),
  };
}

function found(row: CollectionRow | undefined): CollectionRow {
  if (row === undefined) throw new NotFoundError("Collection not found");
  return row;
}

// The only unique index on collection besides its random id is (user_id, lower(name)).
async function uniqueName<T>(query: Promise<T>): Promise<T> {
  try {
    return await query;
  } catch (error) {
    if (
      error instanceof DrizzleQueryError &&
      error.cause instanceof postgres.PostgresError &&
      error.cause.code === UNIQUE_VIOLATION
    ) {
      throw new ConflictError("A collection with that name already exists");
    }
    throw error;
  }
}

// key share holds the row until the caller's transaction ends, so a concurrent
// delete cannot slip in before the caller inserts a collection_item for it.
export async function requireCollection(db: Db | Tx, { userId, id }: Owned): Promise<void> {
  const [row] = await db
    .select({ id: collection.id })
    .from(collection)
    .where(and(eq(collection.id, id), eq(collection.userId, userId)))
    .for("key share");
  if (row === undefined) throw new NotFoundError("Collection not found");
}

// A filing joins only the caller's links, even inside the caller's own collection.
function ownedFiling(userId: string) {
  return and(eq(savedLink.id, collectionItem.savedLinkId), eq(savedLink.userId, userId));
}

function linkCounts(db: Db, userId: string) {
  return db
    .select({ linkCount: count().as("link_count") })
    .from(collectionItem)
    .innerJoin(savedLink, ownedFiling(userId))
    .where(eq(collectionItem.collectionId, collection.id))
    .as("link_counts");
}

function newestFilings(db: Db, userId: string) {
  return db
    .select({
      kind: resource.kind,
      thumbnailUrl: resource.thumbnailUrl,
      canonicalUrl: resource.canonicalUrl,
      filedAt: collectionItem.createdAt,
      linkId: savedLink.id,
    })
    .from(collectionItem)
    .innerJoin(savedLink, ownedFiling(userId))
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .where(eq(collectionItem.collectionId, collection.id))
    .orderBy(desc(collectionItem.createdAt), desc(savedLink.id))
    .limit(COLLECTION_COVER_SIZE)
    .as("cover");
}

type CoverRow = Omit<CoverTile, "domain"> & { canonicalUrl: string };

function toCoverTile({ kind, thumbnailUrl, canonicalUrl }: CoverRow): CoverTile {
  return { kind, thumbnailUrl, domain: new URL(canonicalUrl).hostname };
}

type ListRow = { collection: CollectionRow; linkCount: number; tile: CoverRow | null };

// Rows arrive in list order, one per cover tile (or one with no tile), so the
// first row of each collection fixes its place.
function groupByCollection(rows: ListRow[]): ListedCollection[] {
  const byId = new Map<string, ListedCollection>();
  for (const { collection: row, linkCount, tile } of rows) {
    const item = byId.get(row.id) ?? { ...toCollection(row), linkCount, cover: [] };
    if (tile !== null) item.cover.push(toCoverTile(tile));
    byId.set(row.id, item);
  }
  return [...byId.values()];
}

export async function listCollections(db: Db, userId: string): Promise<ListCollectionsResponse> {
  const counts = linkCounts(db, userId);
  const cover = newestFilings(db, userId);
  const rows = await db
    .select({
      collection,
      linkCount: counts.linkCount,
      tile: { kind: cover.kind, thumbnailUrl: cover.thumbnailUrl, canonicalUrl: cover.canonicalUrl },
    })
    .from(collection)
    .innerJoinLateral(counts, sql`true`)
    .leftJoinLateral(cover, sql`true`)
    .where(eq(collection.userId, userId))
    .orderBy(
      desc(collection.pinned),
      desc(collection.lastUsedAt),
      asc(collection.id),
      desc(cover.filedAt),
      desc(cover.linkId),
    );
  return { items: groupByCollection(rows) };
}

export async function createCollection(db: Db, userId: string, name: string): Promise<Collection> {
  const [row] = await uniqueName(db.insert(collection).values({ userId, name }).returning());
  return toCollection(found(row));
}

export async function updateCollection(db: Db, owned: Owned, changes: UpdateCollectionRequest): Promise<Collection> {
  const [row] = await uniqueName(
    db
      .update(collection)
      .set(changes)
      .where(and(eq(collection.id, owned.id), eq(collection.userId, owned.userId)))
      .returning(),
  );
  return toCollection(found(row));
}

export async function deleteCollection(db: Db, { userId, id }: Owned): Promise<void> {
  const [row] = await db
    .delete(collection)
    .where(and(eq(collection.id, id), eq(collection.userId, userId)))
    .returning();
  found(row);
}
