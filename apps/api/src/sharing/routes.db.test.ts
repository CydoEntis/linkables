import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import {
  ownSharedCollectionsResponseSchema,
  SHARED_LINKS_MAX,
  sharedCollectionSchema,
  shareStateSchema,
  shareTokenSchema,
} from "@linkables/shared/sharing";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionGroup, collectionItem, resource, savedLink } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

type App = ReturnType<typeof createTestApp>;

function share(app: App, user: TestUser, method: "GET" | "POST" | "DELETE", collectionId: string) {
  return app.request(`/api/v1/collections/${collectionId}/share`, { method, headers: user.headers });
}

async function tokenOf(res: Response): Promise<string | null> {
  expect(res.status).toBe(200);
  return successEnvelopeSchema(shareStateSchema).parse(await res.json()).data.token;
}

async function turnOn(app: App, user: TestUser, collectionId: string): Promise<string> {
  const token = await tokenOf(await share(app, user, "POST", collectionId));
  return shareTokenSchema.parse(token);
}

function view(app: App, token: string, headers: Record<string, string> = {}) {
  return app.request(`/api/v1/shared/${token}`, { headers });
}

async function viewed(res: Response) {
  expect(res.status).toBe(200);
  return successEnvelopeSchema(sharedCollectionSchema).parse(await res.json()).data;
}

async function notFound(res: Response) {
  expect(res.status).toBe(404);
  const { error } = failureEnvelopeSchema.parse(await res.json());
  expect(error.code).toBe("NOT_FOUND");
  return error;
}

async function insertCollection(userId: string, name: string) {
  const [row] = await db.insert(collection).values({ userId, name }).returning();
  if (row === undefined) throw new Error("no collection");
  return row;
}

type LinkSeed = { url: string; title?: string; description?: string; thumbnailUrl?: string; titleOverride?: string; note?: string };

async function insertLink(userId: string, collectionId: string | null, seed: LinkSeed) {
  const [res] = await db
    .insert(resource)
    .values({ canonicalUrl: seed.url, title: seed.title, description: seed.description, thumbnailUrl: seed.thumbnailUrl, kind: "page" })
    .onConflictDoUpdate({ target: resource.canonicalUrl, set: { canonicalUrl: seed.url } })
    .returning();
  if (res === undefined) throw new Error("no resource");
  const [link] = await db
    .insert(savedLink)
    .values({ userId, resourceId: res.id, originalUrl: seed.url, titleOverride: seed.titleOverride, note: seed.note, pinned: true })
    .returning();
  if (link === undefined) throw new Error("no link");
  if (collectionId !== null) await db.insert(collectionItem).values({ collectionId, savedLinkId: link.id });
  return link;
}

describe("collection sharing", () => {
  it("starts off and turns on with a URL-safe token", async () => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip");

    expect(await tokenOf(await share(app, a, "GET", col.id))).toBeNull();
    const token = await turnOn(app, a, col.id);

    expect(await tokenOf(await share(app, a, "GET", col.id))).toBe(token);
  });

  it("keeps the same link when turned on twice", async () => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip");

    const first = await turnOn(app, a, col.id);

    expect(await turnOn(app, a, col.id)).toBe(first);
  });

  it("shows anyone with the link the collection's display fields and nothing private", async () => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip to Japan");
    const older = await insertLink(a.id, col.id, {
      url: "https://example.com/kyoto",
      title: "Kyoto guide",
      description: "Temples and food",
      thumbnailUrl: "https://img.example.com/kyoto.jpg",
      titleOverride: "My Kyoto pick",
      note: "secret note",
    });
    const newer = await insertLink(a.id, col.id, { url: "https://example.com/tokyo" });
    const token = await turnOn(app, a, col.id);

    const res = await view(app, token);
    const text = await res.clone().text();

    expect(await viewed(res)).toEqual({
      name: "Trip to Japan",
      linkCount: 2,
      updatedAt: expect.any(String) as string,
      links: [
        { url: "https://example.com/tokyo", title: null, description: null, thumbnailUrl: null, faviconUrl: null, kind: "page" },
        {
          url: "https://example.com/kyoto",
          title: "My Kyoto pick",
          description: "Temples and food",
          thumbnailUrl: "https://img.example.com/kyoto.jpg",
          faviconUrl: null,
          kind: "page",
        },
      ],
    });
    for (const secret of ["secret note", a.id, col.id, older.id, newer.id]) expect(text).not.toContain(secret);
  });

  it("dates the shared collection by the UTC day of its newest filing, or not at all when it is empty", async () => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip");
    const token = await turnOn(app, a, col.id);
    expect((await viewed(await view(app, token))).updatedAt).toBeNull();

    const older = await insertLink(a.id, null, { url: "https://example.com/old" });
    const newer = await insertLink(a.id, null, { url: "https://example.com/new" });
    await db.insert(collectionItem).values([
      { collectionId: col.id, savedLinkId: older.id, createdAt: new Date("2026-10-20T08:00:00Z") },
      { collectionId: col.id, savedLinkId: newer.id, createdAt: new Date("2026-10-24T09:30:00Z") },
    ]);

    expect((await viewed(await view(app, token))).updatedAt).toBe("2026-10-24T00:00:00.000Z");
  });

  it("shows only that collection's links, and only the owner's", async () => {
    const app = createTestApp({ db });
    const shared = await insertCollection(a.id, "Shared");
    const other = await insertCollection(a.id, "Private");
    await insertLink(a.id, shared.id, { url: "https://example.com/shared" });
    await insertLink(a.id, other.id, { url: "https://example.com/private" });
    await insertLink(a.id, null, { url: "https://example.com/unfiled" });
    const bLink = await insertLink(b.id, null, { url: "https://example.com/b-only" });
    await db.insert(collectionItem).values({ collectionId: shared.id, savedLinkId: bLink.id });
    const token = await turnOn(app, a, shared.id);

    const { links, linkCount } = await viewed(await view(app, token));

    expect(links.map((link) => link.url)).toEqual(["https://example.com/shared"]);
    expect(linkCount).toBe(1);
  });

  it("keeps a login saved in a link's URL out of the shared view", async () => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip");
    await insertLink(a.id, col.id, { url: "https://sam:hunter2@example.com/private?q=1#top" });
    const token = await turnOn(app, a, col.id);

    const { links } = await viewed(await view(app, token));

    expect(links.map((link) => link.url)).toEqual(["https://example.com/private?q=1#top"]);
  });

  it("answers a turned-off link exactly as an unknown or malformed one", async () => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip");
    const token = await turnOn(app, a, col.id);

    expect(await tokenOf(await share(app, a, "DELETE", col.id))).toBeNull();

    const off = await notFound(await view(app, token));
    expect(off).toEqual(await notFound(await view(app, "A".repeat(token.length))));
    expect(off).toEqual(await notFound(await view(app, "not-a-token")));
  });

  it("issues a new link when turned on again, and the old one stays dead", async () => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip");
    const old = await turnOn(app, a, col.id);
    await share(app, a, "DELETE", col.id);

    const fresh = await turnOn(app, a, col.id);

    expect(fresh).not.toBe(old);
    await notFound(await view(app, old));
    expect((await viewed(await view(app, fresh))).name).toBe("Trip");
  });

  it("lets a signed-in viewer open the link too", async () => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip");
    const token = await turnOn(app, a, col.id);

    expect((await viewed(await view(app, token, b.headers))).name).toBe("Trip");
  });

  it.each(["GET", "POST", "DELETE"] as const)("answers %s on another user's collection share as not found and changes nothing", async (method) => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip");
    const token = await turnOn(app, a, col.id);

    await notFound(await share(app, b, method, col.id));

    const [row] = await db.select({ token: collection.shareToken }).from(collection).where(eq(collection.id, col.id));
    expect(row?.token).toBe(token);
  });

  it("limits how often one address can open shared links", async () => {
    const app = createTestApp({ db, now: () => 0 });
    const col = await insertCollection(a.id, "Trip");
    const token = await turnOn(app, a, col.id);
    const from = (ip: string) => view(app, token, { "X-Real-IP": ip });
    for (let i = 0; i < 60; i += 1) expect((await from("203.0.113.7")).status).toBe(200);

    const limited = await from("203.0.113.7");

    expect(limited.status).toBe(429);
    expect(failureEnvelopeSchema.parse(await limited.json()).error.code).toBe("RATE_LIMIT");
    expect((await from("198.51.100.2")).status).toBe(200);
  });
});

describe("GET /collections/shared", () => {
  async function ownShared(app: App, user: TestUser) {
    const res = await app.request("/api/v1/collections/shared", { headers: user.headers });
    expect(res.status).toBe(200);
    return successEnvelopeSchema(ownSharedCollectionsResponseSchema).parse(await res.json()).data.items;
  }

  it("lists only the user's own collections whose link is on, by name", async () => {
    const app = createTestApp({ db });
    const zoo = await insertCollection(a.id, "zoo trip");
    const art = await insertCollection(a.id, "Art");
    await insertCollection(a.id, "Not shared");
    const theirs = await insertCollection(b.id, "B's shared");
    const zooToken = await turnOn(app, a, zoo.id);
    const artToken = await turnOn(app, a, art.id);
    await turnOn(app, b, theirs.id);

    expect(await ownShared(app, a)).toEqual([
      { id: art.id, name: "Art", token: artToken },
      { id: zoo.id, name: "zoo trip", token: zooToken },
    ]);
  });

  it("drops a collection once its link is turned off", async () => {
    const app = createTestApp({ db });
    const col = await insertCollection(a.id, "Trip");
    await turnOn(app, a, col.id);

    await share(app, a, "DELETE", col.id);

    expect(await ownShared(app, a)).toEqual([]);
  });
});

describe("sharing by group", () => {
  async function insertGroup(collectionId: string, name: string, position: number, shared = true) {
    const [row] = await db.insert(collectionGroup).values({ collectionId, name, position, shared }).returning();
    if (row === undefined) throw new Error("no group");
    return row;
  }

  async function fileIn(collectionId: string, savedLinkId: string, groupId: string | null) {
    await db
      .insert(collectionItem)
      .values({ collectionId, savedLinkId, groupId })
      .onConflictDoUpdate({ target: [collectionItem.collectionId, collectionItem.savedLinkId], set: { groupId } });
  }

  function putScope(app: App, user: TestUser, collectionId: string, body: unknown) {
    return app.request(`/api/v1/collections/${collectionId}/share/scope`, {
      method: "PUT",
      headers: { ...user.headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function stateOf(res: Response) {
    expect(res.status).toBe(200);
    return successEnvelopeSchema(shareStateSchema).parse(await res.json()).data;
  }

  // A trip with Food (shared, one link), Hotels (one link) and one ungrouped link.
  async function seedTrip() {
    const col = await insertCollection(a.id, "Trip");
    const food = await insertGroup(col.id, "Food", 0);
    const hotels = await insertGroup(col.id, "Hotels", 1);
    const ramen = await insertLink(a.id, null, { url: "https://example.com/ramen", title: "Ramen" });
    const ryokan = await insertLink(a.id, null, { url: "https://example.com/ryokan", title: "Ryokan" });
    const map = await insertLink(a.id, null, { url: "https://example.com/map", title: "Map" });
    await fileIn(col.id, ramen.id, food.id);
    await fileIn(col.id, ryokan.id, hotels.id);
    await fileIn(col.id, map.id, null);
    return { col, food, hotels, ramen, ryokan, map };
  }

  describe("the owner's share state", () => {
    it("is only the token for a collection with no groups", async () => {
      const app = createTestApp({ db });
      const col = await insertCollection(a.id, "Trip");

      expect(await stateOf(await share(app, a, "GET", col.id))).toEqual({ token: null });
    });

    it("lists the groups in order with the ungrouped switch, everything on to start with", async () => {
      const app = createTestApp({ db });
      const { col, food, hotels } = await seedTrip();

      expect(await stateOf(await share(app, a, "GET", col.id))).toEqual({
        token: null,
        ungrouped: true,
        groups: [
          { id: food.id, name: "Food", shared: true },
          { id: hotels.id, name: "Hotels", shared: true },
        ],
      });
    });

    it("comes back with the scope when the link is turned on", async () => {
      const app = createTestApp({ db });
      const { col, food } = await seedTrip();

      const state = await stateOf(await share(app, a, "POST", col.id));

      expect(state.groups?.[0]).toEqual({ id: food.id, name: "Food", shared: true });
      expect(state.token).not.toBeNull();
    });
  });

  describe("PUT /collections/:id/share/scope", () => {
    it("shares exactly the listed groups and unlists the rest", async () => {
      const app = createTestApp({ db });
      const { col, food, hotels } = await seedTrip();

      const state = await stateOf(await putScope(app, a, col.id, { ungrouped: false, groupIds: [food.id] }));

      expect(state).toEqual({
        token: null,
        ungrouped: false,
        groups: [
          { id: food.id, name: "Food", shared: true },
          { id: hotels.id, name: "Hotels", shared: false },
        ],
      });
    });

    it("gives the same result when sent twice and can share a group again", async () => {
      const app = createTestApp({ db });
      const { col, food, hotels } = await seedTrip();
      await putScope(app, a, col.id, { ungrouped: true, groupIds: [] });

      const body = { ungrouped: true, groupIds: [hotels.id, food.id] };
      const first = await stateOf(await putScope(app, a, col.id, body));

      expect(await stateOf(await putScope(app, a, col.id, body))).toEqual(first);
      expect(first.groups?.map((group) => group.shared)).toEqual([true, true]);
    });

    it("keeps the scope while the link is turned off and on again", async () => {
      const app = createTestApp({ db });
      const { col, food } = await seedTrip();
      await turnOn(app, a, col.id);
      await putScope(app, a, col.id, { ungrouped: false, groupIds: [food.id] });

      await share(app, a, "DELETE", col.id);
      const again = await stateOf(await share(app, a, "POST", col.id));

      expect(again.ungrouped).toBe(false);
      expect(again.groups?.map((group) => group.shared)).toEqual([true, false]);
    });

    it("answers a group of another collection as not found and changes nothing", async () => {
      const app = createTestApp({ db });
      const { col, hotels } = await seedTrip();
      const other = await insertCollection(a.id, "Other");
      const foreign = await insertGroup(other.id, "Foreign", 0);

      await notFound(await putScope(app, a, col.id, { ungrouped: false, groupIds: [hotels.id, foreign.id] }));
      await notFound(await putScope(app, a, col.id, { ungrouped: false, groupIds: [crypto.randomUUID()] }));

      const state = await stateOf(await share(app, a, "GET", col.id));
      expect(state.ungrouped).toBe(true);
      expect(state.groups?.every((group) => group.shared)).toBe(true);
    });

    it("answers another user's collection as not found and changes nothing", async () => {
      const app = createTestApp({ db });
      const { col, food } = await seedTrip();

      await notFound(await putScope(app, b, col.id, { ungrouped: false, groupIds: [] }));
      await notFound(await putScope(app, b, col.id, { ungrouped: false, groupIds: [food.id] }));

      expect(await stateOf(await share(app, a, "GET", col.id))).toMatchObject({ ungrouped: true });
    });

    it("rejects a body that is not a scope", async () => {
      const app = createTestApp({ db });
      const { col, food } = await seedTrip();

      for (const body of [{}, { ungrouped: true }, { ungrouped: true, groupIds: [food.id, food.id] }, { ungrouped: true, groupIds: ["x"] }]) {
        const res = await putScope(app, a, col.id, body);
        expect(res.status).toBe(400);
        expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("VALIDATION");
      }
    });
  });

  describe("the public view", () => {
    it("sends the ungrouped links in links and each shared group after them, in group order", async () => {
      const app = createTestApp({ db });
      const { col } = await seedTrip();
      const token = await turnOn(app, a, col.id);

      const data = await viewed(await view(app, token));

      expect(data.links.map((link) => link.title)).toEqual(["Map"]);
      expect(data.groups?.map((group) => ({ name: group.name, linkCount: group.linkCount, titles: group.links.map((link) => link.title) }))).toEqual([
        { name: "Food", linkCount: 1, titles: ["Ramen"] },
        { name: "Hotels", linkCount: 1, titles: ["Ryokan"] },
      ]);
      expect(data.linkCount).toBe(3);
    });

    it("leaves out an unshared group: its name, its links and its share of the count", async () => {
      const app = createTestApp({ db });
      const { col, food, ryokan } = await seedTrip();
      const token = await turnOn(app, a, col.id);
      await putScope(app, a, col.id, { ungrouped: true, groupIds: [food.id] });

      const res = await view(app, token);
      const text = await res.clone().text();
      const data = await viewed(res);

      expect(data.groups?.map((group) => group.name)).toEqual(["Food"]);
      expect(data.linkCount).toBe(2);
      for (const trace of ["Hotels", "Ryokan", "ryokan", ryokan.id]) expect(text).not.toContain(trace);
    });

    it("leaves out the ungrouped links when that switch is off", async () => {
      const app = createTestApp({ db });
      const { col, food, hotels } = await seedTrip();
      const token = await turnOn(app, a, col.id);
      await putScope(app, a, col.id, { ungrouped: false, groupIds: [food.id, hotels.id] });

      const data = await viewed(await view(app, token));

      expect(data.links).toEqual([]);
      expect(data.linkCount).toBe(2);
      expect(data.groups).toHaveLength(2);
    });

    it("sends no groups key when nothing in a group is shown", async () => {
      const app = createTestApp({ db });
      const { col } = await seedTrip();
      const token = await turnOn(app, a, col.id);
      await putScope(app, a, col.id, { ungrouped: true, groupIds: [] });

      const data = await viewed(await view(app, token));

      expect(Object.keys(data)).toEqual(["name", "linkCount", "updatedAt", "links"]);
      expect(data.links.map((link) => link.title)).toEqual(["Map"]);
    });

    it("hides a shared group that has no links", async () => {
      const app = createTestApp({ db });
      const { col } = await seedTrip();
      await insertGroup(col.id, "Empty", 2);
      const token = await turnOn(app, a, col.id);

      const data = await viewed(await view(app, token));

      expect(data.groups?.map((group) => group.name)).toEqual(["Food", "Hotels"]);
    });

    it("keeps a link that sits in an unshared group of another collection", async () => {
      const app = createTestApp({ db });
      const { col, food, ramen } = await seedTrip();
      const other = await insertCollection(a.id, "Other");
      const secret = await insertGroup(other.id, "Secret", 0, false);
      await fileIn(other.id, ramen.id, secret.id);
      const token = await turnOn(app, a, col.id);
      await putScope(app, a, col.id, { ungrouped: true, groupIds: [food.id] });

      const data = await viewed(await view(app, token));

      expect(data.groups?.[0]?.links.map((link) => link.title)).toEqual(["Ramen"]);
    });

    it("is exactly today's shape for a collection with no groups", async () => {
      const app = createTestApp({ db });
      const col = await insertCollection(a.id, "Trip");
      await insertLink(a.id, col.id, { url: "https://example.com/one" });
      const token = await turnOn(app, a, col.id);

      const text = await (await view(app, token)).text();

      expect(Object.keys((JSON.parse(text) as { data: object }).data)).toEqual(["name", "linkCount", "updatedAt", "links"]);
    });

    it("caps the links across the ungrouped ones and the groups together", async () => {
      const app = createTestApp({ db });
      const col = await insertCollection(a.id, "Big");
      const group = await insertGroup(col.id, "Many", 0);
      const total = SHARED_LINKS_MAX + 5;
      const resources = await db
        .insert(resource)
        .values(Array.from({ length: total }, (_, i) => ({ canonicalUrl: `https://example.com/${String(i)}`, kind: "page" as const })))
        .returning();
      const links = await db
        .insert(savedLink)
        .values(resources.map((res) => ({ userId: a.id, resourceId: res.id, originalUrl: res.canonicalUrl })))
        .returning();
      await db.insert(collectionItem).values(links.map((link, i) => ({ collectionId: col.id, savedLinkId: link.id, groupId: i % 2 === 0 ? group.id : null })));
      const token = await turnOn(app, a, col.id);

      const data = await viewed(await view(app, token));

      expect(data.linkCount).toBe(total);
      expect(data.links.length + (data.groups ?? []).reduce((sum, g) => sum + g.links.length, 0)).toBe(SHARED_LINKS_MAX);
    });

    it("answers a turned-off link the same as an unknown one, whatever the scope", async () => {
      const app = createTestApp({ db });
      const { col, food } = await seedTrip();
      const token = await turnOn(app, a, col.id);
      await putScope(app, a, col.id, { ungrouped: false, groupIds: [food.id] });
      await share(app, a, "DELETE", col.id);

      const off = await notFound(await view(app, token));

      expect(off).toEqual(await notFound(await view(app, "A".repeat(token.length))));
    });
  });
});
