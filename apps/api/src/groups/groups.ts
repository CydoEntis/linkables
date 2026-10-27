import { COLLECTION_GROUPS_MAX, type Group, type ListGroupsResponse } from "@linkables/shared/groups";
import { and, asc, eq, sql } from "drizzle-orm";
import { isUniqueViolation } from "../db/errors";
import type { Db, Tx } from "../db/client";
import { collection, collectionGroup, collectionItem, savedLink } from "../db/schema";
import { requireCollection } from "../collections/collections";
import { ConflictError, NotFoundError, ValidationError } from "../http/errors";

export type InCollection = { userId: string; collectionId: string };
export type GroupRef = InCollection & { groupId: string };

// The only unique index on collection_group besides its random id and the
// (collection_id, id) pair is (collection_id, lower(name)).
async function uniqueName<T>(query: Promise<T>): Promise<T> {
  try {
    return await query;
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ConflictError("A group with that name already exists in this collection");
    }
    throw error;
  }
}

// SQLite write transactions serialize the count check and group positions.
export async function lockCollection(tx: Tx, { userId, collectionId }: InCollection): Promise<void> {
  const [row] = await tx
    .select({ id: collection.id })
    .from(collection)
    .where(and(eq(collection.id, collectionId), eq(collection.userId, userId)));
  if (row === undefined) throw new NotFoundError("Collection not found");
}

// A filing joins only the caller's links, as in the collection counts.
const linkCount = sql<number>`(
  select count(*) from ${collectionItem}
  inner join ${savedLink} on ${savedLink.id} = ${collectionItem.savedLinkId}
  where ${collectionItem.groupId} = ${collectionGroup.id} and ${savedLink.userId} = ${collection.userId}
)`;

function toGroup(row: typeof collectionGroup.$inferSelect & { linkCount: number }): Group {
  return { id: row.id, name: row.name, position: row.position, shared: row.shared, linkCount: row.linkCount };
}

async function groupsOf(db: Db | Tx, collectionId: string): Promise<Group[]> {
  const rows = await db
    .select({ group: collectionGroup, linkCount })
    .from(collectionGroup)
    .innerJoin(collection, eq(collection.id, collectionGroup.collectionId))
    .where(eq(collectionGroup.collectionId, collectionId))
    .orderBy(asc(collectionGroup.position), asc(collectionGroup.id));
  return rows.map((row) => toGroup({ ...row.group, linkCount: row.linkCount }));
}

async function groupOf(tx: Tx, ref: GroupRef): Promise<Group> {
  const found = (await groupsOf(tx, ref.collectionId)).find((group) => group.id === ref.groupId);
  if (found === undefined) throw new NotFoundError("Group not found");
  return found;
}

export function listGroups(db: Db, scope: InCollection): Promise<ListGroupsResponse> {
  return db.transaction(async (tx) => {
    await requireCollection(tx, { userId: scope.userId, id: scope.collectionId });
    return { items: await groupsOf(tx, scope.collectionId) };
  });
}

export function createGroup(db: Db, scope: InCollection, name: string): Promise<Group> {
  return db.transaction(async (tx) => {
    await lockCollection(tx, scope);
    const existing = await groupsOf(tx, scope.collectionId);
    if (existing.length >= COLLECTION_GROUPS_MAX) {
      throw new ConflictError(`A collection holds at most ${String(COLLECTION_GROUPS_MAX)} groups`);
    }
    const [row] = await uniqueName(
      tx.insert(collectionGroup).values({ collectionId: scope.collectionId, name, position: existing.length }).returning(),
    );
    if (row === undefined) throw new NotFoundError("Group not found");
    return toGroup({ ...row, linkCount: 0 });
  });
}

export function renameGroup(db: Db, ref: GroupRef, name: string): Promise<Group> {
  return db.transaction(async (tx) => {
    await lockCollection(tx, ref);
    const renamed = await uniqueName(
      tx
        .update(collectionGroup)
        .set({ name })
        .where(and(eq(collectionGroup.id, ref.groupId), eq(collectionGroup.collectionId, ref.collectionId)))
        .returning({ id: collectionGroup.id }),
    );
    if (renamed.length === 0) throw new NotFoundError("Group not found");
    return groupOf(tx, ref);
  });
}

// The composite foreign key sets the links' group_id to null, so they stay in
// the collection, ungrouped. The remaining positions are closed up to stay dense.
export function deleteGroup(db: Db, ref: GroupRef): Promise<void> {
  return db.transaction(async (tx) => {
    await lockCollection(tx, ref);
    const deleted = await tx
      .delete(collectionGroup)
      .where(and(eq(collectionGroup.id, ref.groupId), eq(collectionGroup.collectionId, ref.collectionId)))
      .returning({ id: collectionGroup.id });
    if (deleted.length === 0) throw new NotFoundError("Group not found");
    const remaining = await groupsOf(tx, ref.collectionId);
    await writePositions(tx, remaining.map((group) => group.id));
    // With no group left the owner has no switch for the ungrouped links, so they go back to shared.
    if (remaining.length === 0) await tx.update(collection).set({ shareUngrouped: true }).where(eq(collection.id, ref.collectionId));
  });
}

async function writePositions(tx: Tx, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  for (const [position, id] of ids.entries()) {
    await tx.update(collectionGroup).set({ position }).where(eq(collectionGroup.id, id));
  }
}

export function reorderGroups(db: Db, scope: InCollection, ids: string[]): Promise<ListGroupsResponse> {
  return db.transaction(async (tx) => {
    await lockCollection(tx, scope);
    const current = new Set((await groupsOf(tx, scope.collectionId)).map((group) => group.id));
    if (ids.length !== current.size || !ids.every((id) => current.has(id))) {
      throw new ValidationError("ids must be exactly the collection's groups", {
        fieldErrors: { ids: "ids must be exactly the collection's groups" },
      });
    }
    await writePositions(tx, ids);
    return { items: await groupsOf(tx, scope.collectionId) };
  });
}
