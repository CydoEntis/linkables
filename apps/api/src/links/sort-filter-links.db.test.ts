import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { listLinksResponseSchema, type ResourceKind } from "@linkables/shared/links";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
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

type Seed = {
  url?: string;
  title?: string;
  titleOverride?: string;
  kind?: ResourceKind;
  pinned?: boolean;
  savedAt?: string;
};

// Returns ids in seed order. Two bulk inserts keep large seeds fast while other
// suites share the database server. Without a savedAt, seeds are a second apart.
async function seed(user: TestUser, seeds: Seed[]): Promise<string[]> {
  const urls = seeds.map((s) => s.url ?? `https://example.com/${randomUUID()}`);
  const resources = await db
    .insert(resource)
    .values(seeds.map((s, i) => ({ canonicalUrl: urls[i] ?? "", title: s.title, kind: s.kind })))
    .returning();
  const resourceIdByUrl = new Map(resources.map((r) => [r.canonicalUrl, r.id]));
  const links = await db
    .insert(savedLink)
    .values(
      seeds.map((s, i) => ({
        userId: user.id,
        resourceId: resourceIdByUrl.get(urls[i] ?? "") ?? "",
        originalUrl: urls[i] ?? "",
        titleOverride: s.titleOverride,
        pinned: s.pinned ?? false,
        savedAt: sql`${s.savedAt ?? new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString()}::timestamptz`,
      })),
    )
    .returning();
  const idByUrl = new Map(links.map((l) => [l.originalUrl, l.id]));
  return urls.map((url) => idByUrl.get(url) ?? "");
}

async function fileInCollection(user: TestUser, linkIds: string[], name = "Reading"): Promise<string> {
  const [col] = await db.insert(collection).values({ userId: user.id, name }).returning();
  if (col === undefined) throw new Error("insert returned no row");
  await db.insert(collectionItem).values(linkIds.map((savedLinkId) => ({ collectionId: col.id, savedLinkId })));
  return col.id;
}

async function list(user: TestUser, query: string) {
  const res = await app.request(`/api/v1/links?${query}`, { headers: user.headers });
  expect(res.status).toBe(200);
  return responseSchema.parse(await res.json()).data;
}

async function walk(user: TestUser, query: string) {
  const ids: string[] = [];
  let cursor: string | null = null;
  do {
    const page = await list(user, cursor === null ? query : `${query}&cursor=${cursor}`);
    ids.push(...page.items.map((item) => item.id));
    cursor = page.cursor;
  } while (cursor !== null);
  return ids;
}

async function rename(user: TestUser, linkId: string | undefined, titleOverride: string) {
  const res = await app.request(`/api/v1/links/${String(linkId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...user.headers },
    body: JSON.stringify({ titleOverride }),
  });
  expect(res.status).toBe(200);
}

function titlePage(user: TestUser, cursor: string) {
  return app.request(`/api/v1/links?sort=title&cursor=${cursor}`, { headers: user.headers });
}

async function expectInvalidCursor(res: Response) {
  expect(res.status).toBe(400);
  expect(failureEnvelopeSchema.parse(await res.json()).error).toMatchObject({
    code: "VALIDATION",
    message: "Cursor is no longer valid",
  });
}

type FilterCase = { name: string; query: string; match: Seed; miss: Seed };

const filterCases: FilterCase[] = [
  { name: "kind", query: "kind=video", match: { kind: "video" }, miss: { kind: "page" } },
  { name: "pinned=true", query: "pinned=true", match: { pinned: true }, miss: { pinned: false } },
  { name: "pinned=false", query: "pinned=false", match: { pinned: false }, miss: { pinned: true } },
  {
    name: "from date, inclusive",
    query: "from=2026-03-01",
    match: { savedAt: "2026-03-01T00:00:00Z" },
    miss: { savedAt: "2026-02-28T23:59:59.999999Z" },
  },
  {
    name: "to date, through the end of that day",
    query: "to=2026-03-01",
    match: { savedAt: "2026-03-01T23:59:59.999999Z" },
    miss: { savedAt: "2026-03-02T00:00:00Z" },
  },
  {
    name: "from datetime with offset, inclusive",
    query: `from=${encodeURIComponent("2026-03-01T12:00:00+02:00")}`,
    match: { savedAt: "2026-03-01T10:00:00Z" },
    miss: { savedAt: "2026-03-01T09:59:59.999999Z" },
  },
  {
    name: "to datetime, inclusive",
    query: "to=2026-03-01T12:00:00Z",
    match: { savedAt: "2026-03-01T12:00:00Z" },
    miss: { savedAt: "2026-03-01T12:00:00.000001Z" },
  },
  {
    name: "to datetime with microseconds, inclusive",
    query: "to=2026-03-01T12:00:00.000001Z",
    match: { savedAt: "2026-03-01T12:00:00.000001Z" },
    miss: { savedAt: "2026-03-01T12:00:00.000002Z" },
  },
];

describe("GET /links filters", () => {
  it.each(filterCases)("filters by $name", async ({ query, match, miss }) => {
    const [hit] = await seed(a, [match, miss]);

    expect(await walk(a, query)).toEqual([hit]);
  });

  it.each(filterCases)("combines $name with q", async ({ query, match, miss }) => {
    const [hit] = await seed(a, [
      { ...match, title: "Zeppelin history" },
      { ...match, title: "Baking bread" },
      { ...miss, title: "Zeppelin history" },
    ]);

    expect(await walk(a, `${query}&q=zeppelin`)).toEqual([hit]);
  });

  it.each(filterCases)("combines $name with collectionId", async ({ query, match, miss }) => {
    const [hit, , filedMiss] = await seed(a, [match, match, miss]);
    const col = await fileInCollection(a, [hit ?? "", filedMiss ?? ""]);

    expect(await walk(a, `${query}&collectionId=${col}`)).toEqual([hit]);
  });

  it("returns a whole day when from and to are the same date", async () => {
    const [early, late] = await seed(a, [
      { savedAt: "2026-03-01T00:00:00Z" },
      { savedAt: "2026-03-01T23:59:59Z" },
      { savedAt: "2026-03-02T00:00:00Z" },
    ]);

    expect(await walk(a, "from=2026-03-01&to=2026-03-01")).toEqual([late, early]);
  });

  it("matches no link whose kind is not known yet", async () => {
    await seed(a, [{}]);

    for (const kind of ["video", "page", "other"]) expect(await walk(a, `kind=${kind}`)).toEqual([]);
  });

  it("combines every filter with q and the inbox view", async () => {
    const hit: Seed = { kind: "video", pinned: true, savedAt: "2026-03-01T12:00:00Z", title: "Zeppelin" };
    const [inboxHit, filed] = await seed(a, [
      hit,
      { ...hit, url: "https://example.com/filed" },
      { ...hit, kind: "page" },
      { ...hit, pinned: false },
      { ...hit, savedAt: "2026-02-28T12:00:00Z" },
      { ...hit, savedAt: "2026-03-02T12:00:00Z" },
      { ...hit, title: "Bread" },
    ]);
    await fileInCollection(a, [filed ?? ""]);

    expect(
      await walk(a, "view=inbox&kind=video&pinned=true&from=2026-03-01&to=2026-03-01&q=zeppelin&limit=1"),
    ).toEqual([inboxHit]);
  });

  it("shows a user none of another user's links under any filter or sort", async () => {
    await seed(a, [{ kind: "video", pinned: true, title: "Zeppelin", savedAt: "2026-03-01T12:00:00Z" }]);
    const own = await seed(b, [{ kind: "video", pinned: true, title: "Zeppelin", savedAt: "2026-03-01T12:00:00Z" }]);

    const query = "kind=video&pinned=true&from=2026-03-01&to=2026-03-01&q=zeppelin&limit=1";
    for (const sort of ["newest", "oldest", "title"]) expect(await walk(b, `${query}&sort=${sort}`)).toEqual(own);
  });
});

describe("GET /links sort", () => {
  it("sorts newest first by default and with sort=newest", async () => {
    const ids = (await seed(a, [{}, {}, {}, {}, {}])).reverse();

    expect(await walk(a, "limit=2")).toEqual(ids);
    expect(await walk(a, "sort=newest&limit=2")).toEqual(ids);
  });

  it("walks oldest first with no duplicates or gaps", async () => {
    const ids = await seed(a, [{}, {}, {}, {}, {}, {}, {}]);

    expect(await walk(a, "sort=oldest&limit=3")).toEqual(ids);
  });

  it("breaks ties on saved_at by id under sort=oldest", async () => {
    const ids = await seed(a, Array.from({ length: 5 }, () => ({ savedAt: "2026-01-01T00:00:00Z" })));

    expect(await walk(a, "sort=oldest&limit=2")).toEqual(ids.toSorted());
  });

  it("pages oldest first through links saved microseconds apart", async () => {
    const ids = await seed(a, [
      { savedAt: "2026-01-01T00:00:00.123100Z" },
      { savedAt: "2026-01-01T00:00:00.123200Z" },
      { savedAt: "2026-01-01T00:00:00.123300Z" },
    ]);

    expect(await walk(a, "sort=oldest&limit=1")).toEqual(ids);
  });

  it("walks titles A to Z ignoring case, with accents beside their letter, overrides and URLs as fallback", async () => {
    const [banana, apple1, zoo, apple2, url, override, eclairAccent, eclair, emile, apple3] = await seed(a, [
      { title: "banana" },
      { title: "Apple" },
      { title: "zoo" },
      { title: "apple" },
      { url: "https://aardvark.example/" },
      { title: "Zebra", titleOverride: "Cherry" },
      { title: "éclair" },
      { title: "Eclair" },
      { title: "Émile" },
      { title: "APPLE" },
    ]);
    const apples = [apple1, apple2, apple3].map(String).toSorted();
    const expected = [...apples, banana, override, eclair, eclairAccent, emile, url, zoo];

    expect(await walk(a, "sort=title&limit=100")).toEqual(expected);
    expect(await walk(a, "sort=title&limit=2")).toEqual(expected);
    expect(await walk(a, "sort=title&limit=1")).toEqual(expected);
  });

  it("walks a large title sort with many equal titles and no duplicates or gaps", async () => {
    const seeds: Seed[] = ["Same", "same", "SAME", "other", "Ünder", "under"].map((title) => ({ title }));
    seeds.push({});
    await seed(a, Array.from({ length: 70 }, (_, i) => seeds[i % seeds.length] ?? {}));

    const all = await walk(a, "sort=title&limit=100");

    expect(all).toHaveLength(70);
    expect(await walk(a, "sort=title&limit=3")).toEqual(all);
  });

  it("walks the title sort combined with filters and a collection", async () => {
    const ids = await seed(a, [
      { title: "b", kind: "video" },
      { title: "a", kind: "video" },
      { title: "A", kind: "video" },
      { title: "c", kind: "page" },
      { title: "a", kind: "video" },
    ]);
    const col = await fileInCollection(a, ids);
    const videos = [ids[1], ids[2], ids[4]].map(String).toSorted();

    expect(await walk(a, `sort=title&kind=video&collectionId=${col}&limit=1`)).toEqual([...videos, ids[0]]);
  });

  it("rejects a cursor from one sort used with another", async () => {
    await seed(a, [{ title: "a" }, { title: "b" }]);
    const { cursor } = await list(a, "sort=title&limit=1");

    const res = await app.request(`/api/v1/links?sort=oldest&cursor=${String(cursor)}`, { headers: a.headers });

    expect(res.status).toBe(400);
    expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("VALIDATION");
  });

  it("keeps the title and URL of the last link out of a title cursor", async () => {
    await seed(a, [{ url: "https://aardvark.example/?token=secret" }, { title: "Zebra" }]);
    const { items, cursor } = await list(a, "sort=title&limit=1");

    const decoded = Buffer.from(String(cursor), "base64url").toString("utf8");

    expect(JSON.parse(decoded)).toMatchObject({ sort: "title", id: items[0]?.id });
    expect(Object.keys(JSON.parse(decoded) as object).toSorted()).toEqual(["id", "k", "sort"]);
    expect(decoded).not.toMatch(/aardvark|secret/i);
  });

  it.each(["zz", "0"])("rejects a title cursor once its link is renamed to %s", async (title) => {
    const ids = await seed(a, ["a", "b", "c", "d", "e"].map((t) => ({ title: t })));
    const { cursor } = await list(a, "sort=title&limit=3");
    await rename(a, ids[2], title);

    await expectInvalidCursor(await titlePage(a, `${String(cursor)}&limit=3`));
  });

  it("rejects a title cursor once its URL-sorted link gets a fetched title", async () => {
    await seed(a, [{ title: "a" }, { url: "https://b.example/" }, { title: "z" }]);
    const { cursor } = await list(a, "sort=title&limit=2");
    await db.update(resource).set({ title: "zz" }).where(eq(resource.canonicalUrl, "https://b.example/"));

    await expectInvalidCursor(await titlePage(a, `${String(cursor)}&limit=2`));
  });

  it("keeps a title cursor valid when another link is renamed", async () => {
    const ids = await seed(a, ["a", "b", "c", "d", "e"].map((t) => ({ title: t })));
    const { cursor } = await list(a, "sort=title&limit=3");
    await rename(a, ids[4], "0");

    const res = await titlePage(a, `${String(cursor)}&limit=3`);

    expect(res.status).toBe(200);
    expect(responseSchema.parse(await res.json()).data.items.map((item) => item.id)).toEqual([ids[3]]);
  });

  it("rejects a title cursor whose link was deleted mid-walk", async () => {
    await seed(a, [{ title: "a" }, { title: "b" }]);
    const { items, cursor } = await list(a, "sort=title&limit=1");
    await app.request(`/api/v1/links/${String(items[0]?.id)}`, { method: "DELETE", headers: a.headers });

    await expectInvalidCursor(await titlePage(a, String(cursor)));
  });

  it("rejects a title cursor naming another user's link", async () => {
    await seed(b, [{ title: "b's link" }, { title: "more" }]);
    await seed(a, [{ title: "a" }, { title: "z" }]);
    const { cursor } = await list(b, "sort=title&limit=1");

    await expectInvalidCursor(await titlePage(a, String(cursor)));
  });
});
