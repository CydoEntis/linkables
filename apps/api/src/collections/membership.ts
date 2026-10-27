import { and, eq } from "drizzle-orm";
import type { Db, Tx } from "../db/client";
import { collection, collectionItem, databaseNow, savedLink } from "../db/schema";
import { NotFoundError } from "../http/errors";
import { requireCollection } from "./collections";

export type Membership = { userId: string; collectionId: string; linkId: string };

async function requireSavedLink(tx: Tx, { userId, linkId }: Membership): Promise<void> {
  const [row] = await tx
    .select({ id: savedLink.id })
    .from(savedLink)
    .where(and(eq(savedLink.id, linkId), eq(savedLink.userId, userId)));
  if (row === undefined) throw new NotFoundError("Saved link not found");
}

function requireBoth(tx: Tx, membership: Membership) {
  return Promise.all([
    requireCollection(tx, { userId: membership.userId, id: membership.collectionId }),
    requireSavedLink(tx, membership),
  ]);
}

async function markUsed(tx: Tx, { userId, collectionId }: Membership): Promise<void> {
  await tx
    .update(collection)
    .set({ lastUsedAt: databaseNow })
    .where(and(eq(collection.id, collectionId), eq(collection.userId, userId)));
}

// Only a change in contents counts as use, so a retried PUT or DELETE, or saving
// a link that is already filed, leaves the collection where it was in the list.
// The caller has checked that both rows belong to the user.
export async function fileLink(tx: Tx, membership: Membership): Promise<void> {
  const filed = await tx
    .insert(collectionItem)
    .values({ collectionId: membership.collectionId, savedLinkId: membership.linkId })
    .onConflictDoNothing()
    .returning({ collectionId: collectionItem.collectionId });
  if (filed.length > 0) await markUsed(tx, membership);
}

async function unfileLink(tx: Tx, membership: Membership): Promise<void> {
  const unfiled = await tx
    .delete(collectionItem)
    .where(
      and(
        eq(collectionItem.collectionId, membership.collectionId),
        eq(collectionItem.savedLinkId, membership.linkId),
      ),
    )
    .returning({ collectionId: collectionItem.collectionId });
  if (unfiled.length > 0) await markUsed(tx, membership);
}

export function addToCollection(db: Db, membership: Membership): Promise<void> {
  return db.transaction(async (tx) => {
    await requireBoth(tx, membership);
    await fileLink(tx, membership);
  });
}

export function removeFromCollection(db: Db, membership: Membership): Promise<void> {
  return db.transaction(async (tx) => {
    await requireBoth(tx, membership);
    await unfileLink(tx, membership);
  });
}
