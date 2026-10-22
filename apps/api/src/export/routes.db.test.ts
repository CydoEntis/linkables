import { exportResponseSchema } from "@linkaroo/shared/export";
import { successEnvelopeSchema } from "@linkaroo/shared/http";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionItem, resource, savedLink } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const NOW = Date.UTC(2026, 9, 22, 12);
const app = createTestApp({ db, now: () => NOW });

async function exportFor(user: TestUser) {
  const res = await app.request("/api/v1/export", { headers: user.headers });
  expect(res.status).toBe(200);
  return successEnvelopeSchema(exportResponseSchema).parse(await res.json()).data;
}

async function seedResources(rows: { canonicalUrl: string; title?: string }[]) {
  const inserted = await db.insert(resource).values(rows).returning();
  return new Map(inserted.map((r) => [r.canonicalUrl, r.id]));
}

function id(ids: Map<string, string>, key: string): string {
  const value = ids.get(key);
  if (value === undefined) throw new Error(`no seeded row for ${key}`);
  return value;
}

describe("GET /export", () => {
  it("returns empty lists for an account with nothing saved", async () => {
    expect(await exportFor(a)).toEqual({
      version: 1,
      exportedAt: new Date(NOW).toISOString(),
      links: [],
      collections: [],
    });
  });

  it("exports the caller's links oldest first with their fields and collection ids", async () => {
    const resources = await seedResources([
      { canonicalUrl: "https://example.com/one", title: "Fetched one" },
      { canonicalUrl: "https://example.com/two" },
      { canonicalUrl: "https://example.com/three", title: "Fetched three" },
    ]);
    const cols = await db
      .insert(collection)
      .values([
        { userId: a.id, name: "Reading", createdAt: new Date("2026-01-01T00:00:00Z") },
        { userId: a.id, name: "Work", createdAt: new Date("2026-01-02T00:00:00Z") },
      ])
      .returning();
    const colId = new Map(cols.map((c) => [c.name, c.id]));
    const links = await db
      .insert(savedLink)
      .values([
        {
          userId: a.id,
          resourceId: id(resources, "https://example.com/one"),
          originalUrl: "https://example.com/one?utm_source=x",
          titleOverride: "My title",
          note: "a note",
          pinned: true,
          savedAt: new Date("2026-02-01T00:00:00Z"),
        },
        {
          userId: a.id,
          resourceId: id(resources, "https://example.com/two"),
          originalUrl: "https://example.com/two",
          savedAt: new Date("2026-03-01T00:00:00Z"),
        },
        {
          userId: a.id,
          resourceId: id(resources, "https://example.com/three"),
          originalUrl: "https://example.com/three",
          savedAt: new Date("2026-01-15T00:00:00Z"),
        },
      ])
      .returning();
    const linkId = new Map(links.map((l) => [l.originalUrl, l.id]));
    await db.insert(collectionItem).values([
      { collectionId: id(colId, "Work"), savedLinkId: id(linkId, "https://example.com/one?utm_source=x") },
      { collectionId: id(colId, "Reading"), savedLinkId: id(linkId, "https://example.com/one?utm_source=x") },
      { collectionId: id(colId, "Work"), savedLinkId: id(linkId, "https://example.com/three") },
    ]);

    const exported = await exportFor(a);

    expect(exported.collections).toEqual([
      { id: id(colId, "Reading"), name: "Reading", createdAt: "2026-01-01T00:00:00.000Z" },
      { id: id(colId, "Work"), name: "Work", createdAt: "2026-01-02T00:00:00.000Z" },
    ]);
    expect(exported.links).toEqual([
      {
        canonicalUrl: "https://example.com/three",
        originalUrl: "https://example.com/three",
        title: "Fetched three",
        titleOverride: null,
        note: null,
        pinned: false,
        savedAt: "2026-01-15T00:00:00.000Z",
        collectionIds: [id(colId, "Work")],
      },
      {
        canonicalUrl: "https://example.com/one",
        originalUrl: "https://example.com/one?utm_source=x",
        title: "Fetched one",
        titleOverride: "My title",
        note: "a note",
        pinned: true,
        savedAt: "2026-02-01T00:00:00.000Z",
        collectionIds: [id(colId, "Reading"), id(colId, "Work")],
      },
      {
        canonicalUrl: "https://example.com/two",
        originalUrl: "https://example.com/two",
        title: null,
        titleOverride: null,
        note: null,
        pinned: false,
        savedAt: "2026-03-01T00:00:00.000Z",
        collectionIds: [],
      },
    ]);
  });

  it("leaves out another user's links and collections, even on a shared resource", async () => {
    const shared = "https://example.com/shared";
    const bOnly = "https://example.com/b-only";
    const resources = await seedResources([{ canonicalUrl: shared, title: "Shared" }, { canonicalUrl: bOnly }]);
    const [aCol, bCol] = await db
      .insert(collection)
      .values([
        { userId: a.id, name: "Mine" },
        { userId: b.id, name: "Theirs" },
      ])
      .returning();
    const [aLink, bShared] = await db
      .insert(savedLink)
      .values([
        { userId: a.id, resourceId: id(resources, shared), originalUrl: `${shared}#a` },
        { userId: b.id, resourceId: id(resources, shared), originalUrl: `${shared}#b` },
        { userId: b.id, resourceId: id(resources, bOnly), originalUrl: bOnly },
      ])
      .returning();
    if (!aCol || !bCol || !aLink || !bShared) throw new Error("seed failed");
    await db.insert(collectionItem).values([
      { collectionId: aCol.id, savedLinkId: aLink.id },
      { collectionId: bCol.id, savedLinkId: bShared.id },
    ]);

    const exported = await exportFor(a);

    expect(exported.collections.map((c) => c.name)).toEqual(["Mine"]);
    expect(exported.links.map((l) => [l.originalUrl, l.collectionIds])).toEqual([
      [`${shared}#a`, [aCol.id]],
    ]);
  });
});
