import { and, eq, inArray } from "drizzle-orm";
import { requireCollection } from "../collections/collections";
import type { Db, Tx } from "../db/client";
import { collectionGroup, collectionItem, savedLink } from "../db/schema";
import { NotFoundError } from "../http/errors";
import type { InCollection } from "./groups";

export type Move = InCollection & { linkId: string; groupId: string | null };

// key share holds the group until the transaction ends, so a concurrent delete
// of it cannot slip in between this check and the update.
async function requireGroup(tx: Tx, { collectionId, groupId }: Move): Promise<void> {
  if (groupId === null) return;
  const [row] = await tx
    .select({ id: collectionGroup.id })
    .from(collectionGroup)
    .where(and(eq(collectionGroup.id, groupId), eq(collectionGroup.collectionId, collectionId)));
  if (row === undefined) throw new NotFoundError("Group not found");
}

// Placement is on the filing, so the same link can sit in another group, or none,
// in each of its collections.
export function moveLink(db: Db, move: Move): Promise<void> {
  return db.transaction(async (tx) => {
    await requireCollection(tx, { userId: move.userId, id: move.collectionId });
    await requireGroup(tx, move);
    const owned = tx
      .select({ id: savedLink.id })
      .from(savedLink)
      .where(and(eq(savedLink.id, move.linkId), eq(savedLink.userId, move.userId)));
    const moved = await tx
      .update(collectionItem)
      .set({ groupId: move.groupId })
      .where(
        and(
          eq(collectionItem.collectionId, move.collectionId),
          eq(collectionItem.savedLinkId, move.linkId),
          inArray(collectionItem.savedLinkId, owned),
        ),
      )
      .returning({ id: collectionItem.savedLinkId });
    if (moved.length === 0) throw new NotFoundError("Saved link not found");
  });
}
