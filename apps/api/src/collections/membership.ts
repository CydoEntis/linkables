import { and, eq } from "drizzle-orm";
import type { Db, Tx } from "../db/client";
import { collectionItem, savedLink } from "../db/schema";
import { NotFoundError } from "../http/errors";
import { requireCollection } from "./collections";

export type Membership = { userId: string; collectionId: string; linkId: string };

async function requireSavedLink(tx: Tx, { userId, linkId }: Membership): Promise<void> {
  const [row] = await tx
    .select({ id: savedLink.id })
    .from(savedLink)
    .where(and(eq(savedLink.id, linkId), eq(savedLink.userId, userId)))
    .for("key share");
  if (row === undefined) throw new NotFoundError("Saved link not found");
}

function requireBoth(tx: Tx, membership: Membership) {
  return Promise.all([
    requireCollection(tx, { userId: membership.userId, id: membership.collectionId }),
    requireSavedLink(tx, membership),
  ]);
}

export function addToCollection(db: Db, membership: Membership): Promise<void> {
  return db.transaction(async (tx) => {
    await requireBoth(tx, membership);
    await tx
      .insert(collectionItem)
      .values({ collectionId: membership.collectionId, savedLinkId: membership.linkId })
      .onConflictDoNothing();
  });
}

export function removeFromCollection(db: Db, membership: Membership): Promise<void> {
  return db.transaction(async (tx) => {
    await requireBoth(tx, membership);
    await tx
      .delete(collectionItem)
      .where(
        and(
          eq(collectionItem.collectionId, membership.collectionId),
          eq(collectionItem.savedLinkId, membership.linkId),
        ),
      );
  });
}
