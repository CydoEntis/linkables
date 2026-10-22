import { successEnvelopeSchema } from "@linkaroo/shared/http";
import { listLinksResponseSchema } from "@linkaroo/shared/links";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionItem, resource, savedLink } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const responseSchema = successEnvelopeSchema(listLinksResponseSchema);
const app = createTestApp({ db });

function only<T>(rows: T[]): T {
  const [row] = rows;
  if (row === undefined) throw new Error("insert returned no row");
  return row;
}

// savedAt is a Postgres timestamp literal so tests can use sub-millisecond precision.
async function seedLink(user: TestUser, savedAt: string): Promise<string> {
  const res = only(
    await db
      .insert(resource)
      .values({ canonicalUrl: `https://example.com/${randomUUID()}` })
      .returning(),
  );
  const link = only(
    await db
      .insert(savedLink)
      .values({
        userId: user.id,
        resourceId: res.id,
        originalUrl: res.canonicalUrl,
        savedAt: sql`${savedAt}::timestamptz`,
      })
      .returning(),
  );
  return link.id;
}

// Returns ids newest first, as the list should order them.
async function seedLinks(user: TestUser, count: number): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    ids.push(await seedLink(user, new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString()));
  }
  return ids.reverse();
}

async function fileInCollection(user: TestUser, linkIds: string[]) {
  const col = only(await db.insert(collection).values({ userId: user.id, name: "Reading" }).returning());
  await db.insert(collectionItem).values(linkIds.map((savedLinkId) => ({ collectionId: col.id, savedLinkId })));
}

async function list(user: TestUser, query = "") {
  const res = await app.request(`/api/v1/links?${query}`, { headers: user.headers });
  expect(res.status).toBe(200);
  return responseSchema.parse(await res.json()).data;
}

async function walk(user: TestUser, query: string, between: () => Promise<void> = async () => {}) {
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const page = await list(user, cursor === null ? query : `${query}&cursor=${cursor}`);
    ids.push(...page.items.map((item) => item.id));
    cursor = page.cursor;
    await between();
  } while (cursor !== null);
  return ids;
}

describe("GET /links", () => {
  it("returns the caller's links newest first with their resource", async () => {
    const ids = await seedLinks(a, 3);

    const page = await list(a);

    expect(page.items.map((item) => item.id)).toEqual(ids);
    expect(page.items[0]).toMatchObject({ pinned: false, resource: { fetchStatus: "pending" } });
    expect(page.cursor).toBeNull();
  });

  it("includes links in a collection in the default view", async () => {
    const ids = await seedLinks(a, 2);
    await fileInCollection(a, ids.slice(0, 1));

    expect((await list(a)).items.map((item) => item.id)).toEqual(ids);
  });

  it("excludes links in a collection from the inbox", async () => {
    const ids = await seedLinks(a, 5);
    await fileInCollection(a, ids.filter((_, i) => i % 2 === 1));

    expect(await walk(a, "view=inbox&limit=1")).toEqual(ids.filter((_, i) => i % 2 === 0));
  });

  it("returns 50 links by default", async () => {
    await seedLinks(a, 51);

    const page = await list(a);

    expect(page.items).toHaveLength(50);
    expect(page.cursor).not.toBeNull();
  });

  it("returns up to 100 links when asked", async () => {
    await seedLinks(a, 101);

    expect((await list(a, "limit=100")).items).toHaveLength(100);
  });

  it("walks every page once with no duplicates or gaps", async () => {
    const ids = await seedLinks(a, 7);

    expect(await walk(a, "limit=3")).toEqual(ids);
  });

  it("returns no cursor when the last page is exactly full", async () => {
    await seedLinks(a, 3);

    expect((await list(a, "limit=3")).cursor).toBeNull();
  });

  it("keeps later pages stable when links are saved between fetches", async () => {
    const ids = await seedLinks(a, 5);
    let saves = 0;
    const saveNewLink = async () => {
      saves += 1;
      await app.request("/api/v1/links", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...a.headers },
        body: JSON.stringify({ url: `https://example.com/new/${String(saves)}` }),
      });
    };

    expect(await walk(a, "limit=2", saveNewLink)).toEqual(ids);
    expect((await list(a)).items).toHaveLength(5 + saves);
  });

  it("breaks ties on saved_at by id", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) ids.push(await seedLink(a, "2026-01-01T00:00:00Z"));

    expect(await walk(a, "limit=2")).toEqual(ids.toSorted().reverse());
  });

  it("pages through links saved microseconds apart without gaps", async () => {
    const third = await seedLink(a, "2026-01-01T00:00:00.123100Z");
    const second = await seedLink(a, "2026-01-01T00:00:00.123200Z");
    const first = await seedLink(a, "2026-01-01T00:00:00.123300Z");

    expect(await walk(a, "limit=1")).toEqual([first, second, third]);
  });

  it("shows a user none of another user's links", async () => {
    await seedLinks(a, 3);
    const own = await seedLinks(b, 1);

    expect(await walk(b, "limit=1")).toEqual(own);
    expect(await walk(b, "view=inbox&limit=1")).toEqual(own);
  });
});
