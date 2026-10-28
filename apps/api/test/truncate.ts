import { accessRequest, collection, collectionGroup, collectionItem, job, resource, resourceReader, savedLink, shareAllowedEmail, shareCode, shareViewerSession } from "../src/db/schema";
import type { Db } from "../src/db/client";

export async function truncateAll(db: Db) {
  await db.transaction(async (tx) => {
    await tx.delete(collectionItem);
    await tx.delete(collectionGroup);
    await tx.delete(shareAllowedEmail);
    await tx.delete(shareCode);
    await tx.delete(shareViewerSession);
    await tx.delete(job);
    await tx.delete(resourceReader);
    await tx.delete(savedLink);
    await tx.delete(collection);
    await tx.delete(resource);
    await tx.delete(accessRequest);
  });
}
