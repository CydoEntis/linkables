import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import {
  ownSharedCollectionsResponseSchema,
  sharedCollectionSchema,
  shareStateSchema,
  shareTokenSchema,
} from "@linkables/shared/sharing";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionItem, resource, savedLink } from "../db/schema";

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
      updatedAt: expect.any(String),
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

  it("dates the shared collection by its newest filing, or not at all when it is empty", async () => {
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

    expect((await viewed(await view(app, token))).updatedAt).toBe("2026-10-24T09:30:00.000Z");
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
