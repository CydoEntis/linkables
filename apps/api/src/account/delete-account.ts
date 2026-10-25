import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { collection, savedLink } from "../db/schema";

// Deletes from every table with a user_id column; routes.db.test.ts fails when a
// new one is missed. collection_item rows go with either side by cascade, and share
// tokens live on the collection. Resources stay: they are page details shared by
// everyone who saved the URL, not tied to a user.
export async function deleteAccountData(db: Db, userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(collection).where(eq(collection.userId, userId));
    await tx.delete(savedLink).where(eq(savedLink.userId, userId));
  });
}
