import type { Collection, ListCollectionsResponse } from "@linkaroo/shared/collections";
import { and, asc, eq, sql } from "drizzle-orm";
import { DrizzleQueryError } from "drizzle-orm/errors";
import postgres from "postgres";
import type { Db, Tx } from "../db/client";
import { collection } from "../db/schema";
import { ConflictError, NotFoundError } from "../http/errors";

type CollectionRow = typeof collection.$inferSelect;
type Owned = { userId: string; id: string };

const UNIQUE_VIOLATION = "23505";

function toCollection(row: CollectionRow): Collection {
  return { id: row.id, name: row.name, createdAt: row.createdAt.toISOString() };
}

function found(row: CollectionRow | undefined): CollectionRow {
  if (row === undefined) throw new NotFoundError("Collection not found");
  return row;
}

// The only unique constraint on collection is (user_id, name).
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

export async function listCollections(db: Db, userId: string): Promise<ListCollectionsResponse> {
  const rows = await db
    .select()
    .from(collection)
    .where(eq(collection.userId, userId))
    .orderBy(asc(sql`lower(${collection.name})`), asc(collection.name));
  return { items: rows.map(toCollection) };
}

export async function createCollection(db: Db, userId: string, name: string): Promise<Collection> {
  const [row] = await uniqueName(db.insert(collection).values({ userId, name }).returning());
  return toCollection(found(row));
}

export async function renameCollection(db: Db, owned: Owned, name: string): Promise<Collection> {
  const [row] = await uniqueName(
    db
      .update(collection)
      .set({ name })
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
