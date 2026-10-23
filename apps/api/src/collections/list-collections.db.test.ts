import { listCollectionsResponseSchema } from "@linkables/shared/collections";
import { successEnvelopeSchema } from "@linkables/shared/http";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionItem, resource, savedLink } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const app = createTestApp({ db });

async function list(user: TestUser) {
  const res = await app.request("/api/v1/collections", { headers: user.headers });
  expect(res.status).toBe(200);
  return successEnvelopeSchema(listCollectionsResponseSchema).parse(await res.json()).data.items;
}

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);

async function insertCollection(user: TestUser, name: string) {
  const [row] = await db.insert(collection).values({ userId: user.id, name }).returning();
  if (row === undefined) throw new Error("collection insert returned nothing");
  return row.id;
}

// Link n is saved n minutes ago at https://site-n.example, with a thumbnail
// only when n is even, so save order is the reverse of n.
async function insertLinks(user: TestUser, count: number) {
  if (count === 0) return [];
  const numbers = Array.from({ length: count }, (_, n) => n);
  const resources = await db
    .insert(resource)
    .values(
      numbers.map((n) => ({
        canonicalUrl: `https://site-${String(n)}.example/${user.id}`,
        kind: n === 1 ? ("video" as const) : ("page" as const),
        thumbnailUrl: n % 2 === 0 ? `https://img.example/${String(n)}.png` : null,
      })),
    )
    .returning();
  const links = await db
    .insert(savedLink)
    .values(
      resources.map((res, n) => ({
        userId: user.id,
        resourceId: res.id,
        originalUrl: res.canonicalUrl,
        savedAt: minutesAgo(n),
      })),
    )
    .returning();
  return links.map((link) => link.id);
}

// Filed in array order, one minute apart, so the last id is the newest filing.
async function file(collectionId: string, linkIds: string[]) {
  if (linkIds.length === 0) return;
  await db.insert(collectionItem).values(
    linkIds.map((savedLinkId, i) => ({ collectionId, savedLinkId, createdAt: minutesAgo(linkIds.length - i) })),
  );
}

const tile = (n: number) => ({
  kind: n === 1 ? "video" : "page",
  thumbnailUrl: n % 2 === 0 ? `https://img.example/${String(n)}.png` : null,
  domain: `site-${String(n)}.example`,
});

describe("listing collections", () => {
  it("lists pinned collections first, then the most recently used", async () => {
    await db.insert(collection).values([
      { userId: a.id, name: "Old", lastUsedAt: minutesAgo(30) },
      { userId: a.id, name: "Pinned old", pinned: true, lastUsedAt: minutesAgo(20) },
      { userId: a.id, name: "Recent", lastUsedAt: minutesAgo(1) },
      { userId: a.id, name: "Pinned recent", pinned: true, lastUsedAt: minutesAgo(10) },
    ]);

    const items = await list(a);

    expect(items.map((item) => item.name)).toEqual(["Pinned recent", "Pinned old", "Recent", "Old"]);
    expect(items.map((item) => item.pinned)).toEqual([true, true, false, false]);
  });

  it.each([
    [0, []],
    [1, [0]],
    // Filed 0 to 4, the reverse of save order, so newest filings are 4, 3, 2, 1.
    [5, [4, 3, 2, 1]],
  ])("counts %i links and covers the newest filings", async (count, cover) => {
    const col = await insertCollection(a, "Reading");
    await file(col, await insertLinks(a, count));

    const [item] = await list(a);

    expect(item?.linkCount).toBe(count);
    expect(item?.cover).toEqual(cover.map(tile));
  });

  it("never counts or covers another user's link filed into the collection", async () => {
    const col = await insertCollection(a, "Reading");
    const [aLink] = await insertLinks(a, 1);
    const [bLink] = await insertLinks(b, 1);
    if (aLink === undefined || bLink === undefined) throw new Error("links not seeded");
    await file(col, [aLink, bLink]);

    const [item] = await list(a);

    expect(item?.linkCount).toBe(1);
    expect(item?.cover).toEqual([tile(0)]);
  });
});
