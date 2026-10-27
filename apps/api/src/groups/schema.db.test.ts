import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { testUsers } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionGroup, collectionItem, resource, savedLink } from "../db/schema";

const { db, close } = connectTestDb();
const { a } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

describe("collection_item.group_id", () => {
  it("cannot name a group of another collection", async () => {
    const [first, second] = await db
      .insert(collection)
      .values([
        { userId: a.id, name: "One" },
        { userId: a.id, name: "Two" },
      ])
      .returning();
    const [res] = await db.insert(resource).values({ canonicalUrl: "https://example.com/x" }).returning();
    const [link] = await db
      .insert(savedLink)
      .values({ userId: a.id, resourceId: res?.id ?? "", originalUrl: "https://example.com/x" })
      .returning();
    const [group] = await db
      .insert(collectionGroup)
      .values({ collectionId: second?.id ?? "", name: "Elsewhere", position: 0 })
      .returning();

    const filing = db
      .insert(collectionItem)
      .values({ collectionId: first?.id ?? "", savedLinkId: link?.id ?? "", groupId: group?.id ?? "" });

    await expect(filing).rejects.toThrow();
  });
});
