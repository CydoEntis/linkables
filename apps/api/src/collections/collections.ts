import {
  COLLECTION_COVER_SIZE,
  type Collection,
  type CoverTile,
  type ListCollectionsResponse,
  type ListedCollection,
  type UpdateCollectionRequest,
} from "@linkables/shared/collections";
import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { isUniqueViolation } from "../db/errors";
import type { Db, Tx } from "../db/client";
import { collection, collectionItem, resource, savedLink } from "../db/schema";
import { ConflictError, NotFoundError } from "../http/errors";

type CollectionRow = typeof collection.$inferSelect;
type Owned = { userId: string; id: string };

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
    if (isUniqueViolation(error)) {
      throw new ConflictError("A collection with that name already exists");
    }
    throw error;
  }
}

// SQLite write transactions serialize the ownership check with the filing.
export async function requireCollection(db: Db | Tx, { userId, id }: Owned): Promise<void> {
  const [row] = await db
    .select({ id: collection.id })
    .from(collection)
    .where(and(eq(collection.id, id), eq(collection.userId, userId)));
  if (row === undefined) throw new NotFoundError("Collection not found");
}

// A filing joins only the caller's links, even inside the caller's own collection.
function ownedFiling(userId: string) {
  return and(eq(savedLink.id, collectionItem.savedLinkId), eq(savedLink.userId, userId));
}

type CoverRow = Omit<CoverTile, "domain"> & { canonicalUrl: string };
function toCoverTile({ kind, thumbnailUrl, canonicalUrl }: CoverRow): CoverTile {
  return { kind, thumbnailUrl, domain: new URL(canonicalUrl).hostname };
}

export function listCollections(db: Db, userId: string): Promise<ListCollectionsResponse> {
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(collection).where(eq(collection.userId, userId))
      .orderBy(desc(collection.pinned), desc(collection.lastUsedAt), asc(collection.id));
    const totals = await tx.select({ collectionId: collectionItem.collectionId, total: count() })
      .from(collectionItem).innerJoin(collection, eq(collection.id, collectionItem.collectionId))
      .innerJoin(savedLink, ownedFiling(userId)).where(eq(collection.userId, userId))
      .groupBy(collectionItem.collectionId);
    const counts = new Map(totals.map((row) => [row.collectionId, row.total]));
    const ranked = tx.select({
      collectionId: collectionItem.collectionId,
      kind: resource.kind,
      thumbnailUrl: resource.thumbnailUrl,
      canonicalUrl: resource.canonicalUrl,
      rank: sql<number>`row_number() over (partition by ${collectionItem.collectionId} order by ${collectionItem.createdAt} desc, ${savedLink.id} desc)`.as("tile_rank"),
    }).from(collectionItem).innerJoin(collection, eq(collection.id, collectionItem.collectionId))
      .innerJoin(savedLink, ownedFiling(userId)).innerJoin(resource, eq(resource.id, savedLink.resourceId))
      .where(eq(collection.userId, userId)).as("ranked");
    const tiles = await tx.select().from(ranked).where(sql`${ranked.rank} <= ${COLLECTION_COVER_SIZE}`)
      .orderBy(asc(ranked.collectionId), asc(ranked.rank));
    const covers = new Map<string, CoverTile[]>();
    for (const tile of tiles) {
      const cover = covers.get(tile.collectionId) ?? [];
      cover.push(toCoverTile(tile));
      covers.set(tile.collectionId, cover);
    }
    const items: ListedCollection[] = rows.map((row) => ({
      ...toCollection(row), linkCount: counts.get(row.id) ?? 0, cover: covers.get(row.id) ?? [],
    }));
    return { items };
  });
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
