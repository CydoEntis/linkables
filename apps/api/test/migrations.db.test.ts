import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { createDb } from "../src/db/client";
import { migrateDb } from "../src/db/migrate";
import { collection, collectionGroup, collectionItem, resource, savedLink } from "../src/db/schema";

it("reapplying SQLite migrations preserves existing library rows", async () => {
  const connection = createDb("file::memory:");
  try {
    await connection.ready;
    await migrateDb(connection.db);
    const [page] = await connection.db.insert(resource).values({ canonicalUrl: "https://example.com/page" }).returning();
    if (!page) throw new Error("Missing resource");
    await connection.db.insert(savedLink).values({ userId: randomUUID(), resourceId: page.id, originalUrl: page.canonicalUrl });
    await migrateDb(connection.db);
    expect(await connection.db.$count(savedLink)).toBe(1);
    expect(await connection.db.all(sql`pragma integrity_check`)).toEqual([{ integrity_check: "ok" }]);
  } finally { await connection.close(); }
});

it("deleting a group leaves its links ungrouped in the same collection", async () => {
  const connection = createDb("file::memory:");
  const db = connection.db;
  try {
    await connection.ready;
    await migrateDb(db);
    const userId = randomUUID();
    const [page] = await db.insert(resource).values({ canonicalUrl: "https://example.com/grouped" }).returning();
    const [col] = await db.insert(collection).values({ userId, name: "Research" }).returning();
    if (!page || !col) throw new Error("Missing fixture");
    const [link] = await db.insert(savedLink).values({ userId, resourceId: page.id, originalUrl: page.canonicalUrl }).returning();
    const [group] = await db.insert(collectionGroup).values({ collectionId: col.id, name: "Docs", position: 0 }).returning();
    if (!link || !group) throw new Error("Missing fixture");
    await db.insert(collectionItem).values({ collectionId: col.id, savedLinkId: link.id, groupId: group.id });
    await db.delete(collectionGroup).where(eq(collectionGroup.id, group.id));
    expect(await db.select({ collectionId: collectionItem.collectionId, groupId: collectionItem.groupId }).from(collectionItem)).toEqual([{ collectionId: col.id, groupId: null }]);
    expect(await db.all(sql`pragma foreign_key_check`)).toEqual([]);
  } finally { await connection.close(); }
});
