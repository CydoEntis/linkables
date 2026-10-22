import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionItem, job, resource, savedLink } from "./schema";

const USER_A = "0b6e2f3a-5c1d-4e8f-9a2b-3c4d5e6f7a81";
const USER_B = "7d9c1b2a-3e4f-4a5b-8c6d-7e8f9a0b1c22";

const { db, close } = connectTestDb();

afterAll(close);
beforeEach(() => truncateAll(db));

async function insertResource(canonicalUrl = "https://example.com/a") {
  const [row] = await db.insert(resource).values({ canonicalUrl }).returning();
  if (!row) throw new Error("resource insert returned no row");
  return row;
}

async function insertSavedLink(userId: string, resourceId: string) {
  const [row] = await db
    .insert(savedLink)
    .values({ userId, resourceId, originalUrl: "https://example.com/a?ref=me" })
    .returning();
  if (!row) throw new Error("saved_link insert returned no row");
  return row;
}

async function insertCollection(userId: string, name = "Reading") {
  const [row] = await db.insert(collection).values({ userId, name }).returning();
  if (!row) throw new Error("collection insert returned no row");
  return row;
}

async function seedOneOfEach() {
  const res = await insertResource();
  const link = await insertSavedLink(USER_A, res.id);
  const coll = await insertCollection(USER_A);
  await db.insert(collectionItem).values({ collectionId: coll.id, savedLinkId: link.id });
  await db.insert(job).values({ resourceId: res.id });
  return { res, link, coll };
}

// Drizzle wraps the driver error in `cause`; 23505 is unique_violation.
async function expectUniqueViolation(query: Promise<unknown>) {
  await expect(query).rejects.toMatchObject({ cause: { code: "23505" } });
}

describe("schema", () => {
  it("enables row level security on every public table", async () => {
    const rows = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from pg_tables where schemaname = 'public' and not rowsecurity`,
    );

    expect(rows[0]?.count).toBe(0);
  });

  it("stores one row in each table with the documented defaults", async () => {
    const { res, link } = await seedOneOfEach();
    const [queued] = await db.select().from(job);

    expect(res.fetchStatus).toBe("pending");
    expect(link.pinned).toBe(false);
    expect(queued).toMatchObject({ resourceId: res.id, attempts: 0, lockedUntil: null });
    expect(await db.$count(collectionItem)).toBe(1);
  });

  it("rejects a second resource with the same canonical url", async () => {
    await insertResource();

    await expectUniqueViolation(insertResource());
  });

  it("rejects a user saving the same resource twice", async () => {
    const res = await insertResource();
    await insertSavedLink(USER_A, res.id);

    await expectUniqueViolation(insertSavedLink(USER_A, res.id));
  });

  it("lets two users save the same resource", async () => {
    const res = await insertResource();
    await insertSavedLink(USER_A, res.id);
    await insertSavedLink(USER_B, res.id);

    expect(await db.$count(savedLink)).toBe(2);
  });

  it("rejects a user's second collection with the same name", async () => {
    await insertCollection(USER_A);

    await expectUniqueViolation(insertCollection(USER_A));
  });

  it("lets two users use the same collection name", async () => {
    await insertCollection(USER_A);
    await insertCollection(USER_B);

    expect(await db.$count(collection)).toBe(2);
  });

  it("rejects adding a saved link to the same collection twice", async () => {
    const { link, coll } = await seedOneOfEach();

    await expectUniqueViolation(
      db.insert(collectionItem).values({ collectionId: coll.id, savedLinkId: link.id }),
    );
  });

  it("removes collection items when their saved link is deleted", async () => {
    const { link } = await seedOneOfEach();

    await db.delete(savedLink).where(eq(savedLink.id, link.id));

    expect(await db.$count(collectionItem)).toBe(0);
  });

  it("removes collection items when their collection is deleted", async () => {
    const { coll } = await seedOneOfEach();

    await db.delete(collection).where(eq(collection.id, coll.id));

    expect(await db.$count(collectionItem)).toBe(0);
    expect(await db.$count(savedLink)).toBe(1);
  });

  it("removes a resource's jobs when the resource is deleted", async () => {
    const { res, link } = await seedOneOfEach();
    await db.delete(savedLink).where(eq(savedLink.id, link.id));

    await db.delete(resource).where(eq(resource.id, res.id));

    expect(await db.$count(job)).toBe(0);
  });
});
