import { collection, collectionItem, job, resource, savedLink } from "../src/db/schema";
import type { Db } from "../src/db/client";

export async function truncateAll(db: Db) {
  await db.transaction(async (tx) => {
    await tx.delete(collectionItem);
    await tx.delete(job);
    await tx.delete(savedLink);
    await tx.delete(collection);
    await tx.delete(resource);
  });
}
