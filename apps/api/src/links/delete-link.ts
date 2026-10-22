import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { savedLink } from "../db/schema";
import { NotFoundError } from "../http/errors";

export type DeleteLinkInput = { userId: string; linkId: string };

// Only the saved_link goes: its collection_item rows cascade, and the shared
// resource stays for other users (ADR-0004).
export async function deleteLink(db: Db, { userId, linkId }: DeleteLinkInput): Promise<void> {
  const deleted = await db
    .delete(savedLink)
    .where(and(eq(savedLink.id, linkId), eq(savedLink.userId, userId)))
    .returning({ id: savedLink.id });
  if (deleted.length === 0) throw new NotFoundError("Link not found");
}
