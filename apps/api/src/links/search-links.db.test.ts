import { successEnvelopeSchema } from "@linkables/shared/http";
import { listLinksResponseSchema } from "@linkables/shared/links";
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

function only<T>(rows: T[]): T {
  const [row] = rows;
  if (row === undefined) throw new Error("insert returned no row");
  return row;
}

type Seed = { url: string; title?: string; description?: string; titleOverride?: string; savedAt?: string };

async function seed(user: TestUser, { url, title, description, titleOverride, savedAt }: Seed): Promise<string> {
  const existing = await db.select().from(resource).where(eq(resource.canonicalUrl, url));
  const res =
    existing[0] ??
    only(await db.insert(resource).values({ canonicalUrl: url, title, description }).returning());
  const link = only(
    await db
      .insert(savedLink)
      .values({
        userId: user.id,
        resourceId: res.id,
        originalUrl: url,
        titleOverride,
        ...(savedAt === undefined ? {} : { savedAt: sql`${savedAt}::timestamptz` }),
      })
      .returning(),
  );
  return link.id;
}

async function search(user: TestUser, query: string) {
  const res = await app.request(`/api/v1/links?${query}`, { headers: user.headers });
  expect(res.status).toBe(200);
  return responseSchema.parse(await res.json()).data;
}

async function ids(user: TestUser, q: string) {
  return (await search(user, `q=${encodeURIComponent(q)}`)).items.map((item) => item.id);
}

describe("GET /links?q=", () => {
  it("finds a link by a word in its title", async () => {
    const hit = await seed(a, { url: "https://example.com/1", title: "Postgres internals explained" });
    await seed(a, { url: "https://example.com/2", title: "Baking bread" });

    expect(await ids(a, "internals")).toEqual([hit]);
  });

  it("finds a link by a word in its title override", async () => {
    const hit = await seed(a, { url: "https://example.com/1", title: "Untitled", titleOverride: "Kubernetes notes" });

    expect(await ids(a, "kubernetes")).toEqual([hit]);
  });

  it("no longer matches the fetched title once it is overridden", async () => {
    await seed(a, { url: "https://example.com/1", title: "Untitled zeppelin", titleOverride: "My reading" });

    expect(await ids(a, "zeppelin")).toEqual([]);
  });

  it("finds a link by a word in its description", async () => {
    const hit = await seed(a, { url: "https://example.com/1", title: "A talk", description: "About sourdough starters" });

    expect(await ids(a, "sourdough")).toEqual([hit]);
  });

  it("finds a link by its domain", async () => {
    const hit = await seed(a, { url: "https://github.com/drizzle-team/drizzle-orm", title: "Drizzle" });
    await seed(a, { url: "https://example.com/1", title: "Other" });

    expect(await ids(a, "github")).toEqual([hit]);
    expect(await ids(a, "github.com")).toEqual([hit]);
  });

  it("finds a link by a title word and a host word together", async () => {
    const hit = await seed(a, { url: "https://github.com/facebook/react", title: "React" });
    await seed(a, { url: "https://example.com/react", title: "React elsewhere" });

    expect(await ids(a, "react github")).toEqual([hit]);
  });

  it("finds a link by words from different parts of its host", async () => {
    const hit = await seed(a, { url: "https://docs.github.com/en", title: "Manual" });
    await seed(a, { url: "https://github.com/about", title: "About" });

    expect(await ids(a, "docs github")).toEqual([hit]);
  });

  it("finds a link by a tab-separated query", async () => {
    const hit = await seed(a, { url: "https://example.com/1", title: "Tabbed words" });

    expect(await ids(a, "tabbed\twords")).toEqual([hit]);
  });

  it.each(["the", "!", "🦊"])("returns no error for a query with no searchable words: %s", async (q) => {
    await seed(a, { url: "https://example.com/1", title: "The fox" });

    await search(a, `q=${encodeURIComponent(q)}`);
  });

  it("finds a link by a fragment of its URL path", async () => {
    const hit = await seed(a, { url: "https://example.com/docs/websearch-tsquery", title: "Docs" });
    await seed(a, { url: "https://example.com/blog", title: "Blog" });

    expect(await ids(a, "websearch-tsq")).toEqual([hit]);
  });

  it("matches other forms of a word", async () => {
    const hit = await seed(a, { url: "https://example.com/1", title: "How to run faster" });

    expect(await ids(a, "running")).toEqual([hit]);
  });

  it("treats % and _ as literal characters, not wildcards", async () => {
    await seed(a, { url: "https://example.com/1", title: "One" });
    await seed(a, { url: "https://example.com/2", title: "Two" });

    expect(await ids(a, "%")).toEqual([]);
    expect(await ids(a, "_")).toEqual([]);
    expect(await ids(a, "\\")).toEqual([]);
  });

  it("matches a literal % in a URL", async () => {
    const hit = await seed(a, { url: "https://example.com/100%25-sure", title: "Sure" });
    await seed(a, { url: "https://example.com/100-25-sure", title: "Other" });

    expect(await ids(a, "100%25")).toEqual([hit]);
  });

  it("matches a literal _ in a URL", async () => {
    const hit = await seed(a, { url: "https://example.com/snake_case", title: "Snake" });
    await seed(a, { url: "https://example.com/snakeXcase", title: "Other" });

    expect(await ids(a, "snake_case")).toEqual([hit]);
  });

  it.each(['"unclosed', "-word", "a:b", "a & b", "!", "(((", "a)b", "' OR 1=1 --", "a|b <-> c", "*:"])(
    "does not fail on query syntax %s",
    async (q) => {
      await seed(a, { url: "https://example.com/1", title: "Word play" });

      await search(a, `q=${encodeURIComponent(q)}`);
    },
  );

  it("treats a blank query as no query", async () => {
    const all = [
      await seed(a, { url: "https://example.com/1", savedAt: "2026-01-01T00:00:00Z" }),
      await seed(a, { url: "https://example.com/2", savedAt: "2026-01-02T00:00:00Z" }),
    ].reverse();

    expect(await ids(a, "   ")).toEqual(all);
  });

  it("never returns another user's links", async () => {
    await seed(a, { url: "https://github.com/a", title: "Shared word" });
    const own = await seed(b, { url: "https://example.com/b", title: "Shared word" });

    expect(await ids(b, "shared")).toEqual([own]);
    expect(await ids(b, "github")).toEqual([]);
  });

  it("searches another user's resource only through the caller's own override", async () => {
    await seed(a, { url: "https://example.com/1", title: "Plain", titleOverride: "Secret codename" });
    await seed(b, { url: "https://example.com/1" });

    expect(await ids(b, "codename")).toEqual([]);
  });

  it("pages through matches newest first", async () => {
    const matches: string[] = [];
    for (let i = 0; i < 5; i++) {
      const savedAt = new Date(Date.UTC(2026, 0, 1) + i * 1000).toISOString();
      matches.push(await seed(a, { url: `https://example.com/m${String(i)}`, title: "Match me", savedAt }));
      await seed(a, { url: `https://example.com/x${String(i)}`, title: "Nothing", savedAt });
    }

    const walked: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await search(a, `q=match&limit=2${cursor === null ? "" : `&cursor=${cursor}`}`);
      walked.push(...page.items.map((item) => item.id));
      cursor = page.cursor;
    } while (cursor !== null);

    expect(walked).toEqual(matches.reverse());
  });

  it("combines a query with the inbox view", async () => {
    const inInbox = await seed(a, { url: "https://example.com/1", title: "Match one" });
    const filed = await seed(a, { url: "https://example.com/2", title: "Match two" });
    const col = only(await db.insert(collection).values({ userId: a.id, name: "Filed" }).returning());
    await db.insert(collectionItem).values({ collectionId: col.id, savedLinkId: filed });

    expect((await search(a, "q=match&view=inbox")).items.map((item) => item.id)).toEqual([inInbox]);
  });
});
