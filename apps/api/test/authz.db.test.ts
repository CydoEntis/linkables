import { randomUUID } from "node:crypto";
import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { sharedCollectionSchema, shareStateSchema } from "@linkables/shared/sharing";
import { asc, eq, or } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { collection, collectionItem, resource, savedLink } from "../src/db/schema";
import { encodeCursor } from "../src/links/cursor";
import { cursorAt } from "../src/links/sort";
import { createTestApp, testUsers, type TestUser } from "./app";
import { connectTestDb, truncateAll } from "./db";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

type App = ReturnType<typeof createTestApp>;
type Ids = { linkId: string; collectionId: string };
type Probe = { path: string; body?: unknown };
type Seed = { a: Ids; b: Ids; secrets: string[] };

type Case = {
  request: (ids: Ids) => Probe;
  // The ids in the request that name a user's rows; B swaps in A's for each.
  idFields?: readonly (keyof Ids)[];
  // Further reads B makes, for list routes with more than one view or filter.
  listings?: readonly string[];
};

// Every private value A writes carries this, so a leak shows up in any response.
const A_MARKER = "user-a";
const A_ONLY_URL = "https://only-a.example/page";
const SHARED_URL = "https://shared.example/page";
// Both users have a collection with this name, so a 409 would reveal A's.
const SHARED_NAME = "Reading";
const A_INBOX_URL = "https://inbox-a.example/page";
const A_TITLE = `${A_MARKER} title`;
const A_PINNED = true;

// Every route except the public ones below. A new route adds a case here and a
// two-user test beside its source.
const cases: Record<string, Case> = {
  "GET /api/v1/me": { request: () => ({ path: "/api/v1/me" }) },
  "GET /api/v1/links": {
    request: ({ collectionId }) => ({ path: `/api/v1/links?collectionId=${collectionId}` }),
    idFields: ["collectionId"],
    listings: [
      "",
      "view=inbox",
      "sort=oldest",
      "sort=title",
      "q=page",
      "kind=page",
      "pinned=true",
      "from=2000-01-01&to=2100-01-01",
    ].map((query) => `/api/v1/links?${query}`),
  },
  "POST /api/v1/links": {
    request: ({ collectionId }) => ({ path: "/api/v1/links", body: { url: A_ONLY_URL, collectionId } }),
    idFields: ["collectionId"],
  },
  "GET /api/v1/links/:id": {
    request: ({ linkId }) => ({ path: `/api/v1/links/${linkId}` }),
    idFields: ["linkId"],
  },
  "PATCH /api/v1/links/:id": {
    request: ({ linkId }) => ({ path: `/api/v1/links/${linkId}`, body: { note: "changed by b", pinned: false } }),
    idFields: ["linkId"],
  },
  "DELETE /api/v1/links/:id": {
    request: ({ linkId }) => ({ path: `/api/v1/links/${linkId}` }),
    idFields: ["linkId"],
  },
  "GET /api/v1/links/:id/reader": {
    request: ({ linkId }) => ({ path: `/api/v1/links/${linkId}/reader` }),
    idFields: ["linkId"],
  },
  "GET /api/v1/collections": { request: () => ({ path: "/api/v1/collections" }) },
  "POST /api/v1/collections": { request: () => ({ path: "/api/v1/collections", body: { name: SHARED_NAME } }) },
  "PATCH /api/v1/collections/:id": {
    request: ({ collectionId }) => ({ path: `/api/v1/collections/${collectionId}`, body: { name: SHARED_NAME, pinned: true } }),
    idFields: ["collectionId"],
  },
  "DELETE /api/v1/collections/:id": {
    request: ({ collectionId }) => ({ path: `/api/v1/collections/${collectionId}` }),
    idFields: ["collectionId"],
  },
  "PUT /api/v1/collections/:id/links/:linkId": {
    request: ({ collectionId, linkId }) => ({ path: `/api/v1/collections/${collectionId}/links/${linkId}` }),
    idFields: ["collectionId", "linkId"],
  },
  "DELETE /api/v1/collections/:id/links/:linkId": {
    request: ({ collectionId, linkId }) => ({ path: `/api/v1/collections/${collectionId}/links/${linkId}` }),
    idFields: ["collectionId", "linkId"],
  },
  "GET /api/v1/export": { request: () => ({ path: "/api/v1/export" }) },
  "GET /api/v1/collections/:id/share": {
    request: ({ collectionId }) => ({ path: `/api/v1/collections/${collectionId}/share` }),
    idFields: ["collectionId"],
  },
  "POST /api/v1/collections/:id/share": {
    request: ({ collectionId }) => ({ path: `/api/v1/collections/${collectionId}/share` }),
    idFields: ["collectionId"],
  },
  "DELETE /api/v1/collections/:id/share": {
    request: ({ collectionId }) => ({ path: `/api/v1/collections/${collectionId}/share` }),
    idFields: ["collectionId"],
  },
};

// Public on purpose (Rule 3): the health check, the request-access form, which
// only inserts, and a shared collection, which reads only the one collection its
// owner turned a link on for. Each public API route is probed below for what it gives back.
const PUBLIC_ROUTES = new Set(["GET /health", "POST /api/v1/access-requests", "GET /api/v1/shared/:token"]);

const INSERT_ONLY_ROUTES: Record<string, Probe> = {
  "POST /api/v1/access-requests": { path: "/api/v1/access-requests", body: { email: "b@example.com", name: "B" } },
};

const SHARED_READ_ROUTES = ["GET /api/v1/shared/:token"];

// app.routes, not hono/dev's inspectRoutes: inspectRoutes treats any handler
// declared as (c, next) as middleware, so a route whose last handler takes next
// would vanish from it. Each handler of a route is its own entry, and app.use
// registers ALL entries; the API never uses app.all.
function registeredRoutes(app: App): string[] {
  const routes = app.routes.filter((route) => route.method !== "ALL").map(({ method, path }) => `${method} ${path}`);
  return [...new Set(routes)].filter((route) => !PUBLIC_ROUTES.has(route));
}

function unlistedRoutes(app: App): string[] {
  return registeredRoutes(app).filter((route) => !(route in cases));
}

function keyed<T>(rows: T[], key: (row: T) => string): (name: string) => T {
  const byKey = new Map(rows.map((row) => [key(row), row]));
  return (name) => {
    const row = byKey.get(name);
    if (row === undefined) throw new Error(`no seeded row for ${name}`);
    return row;
  };
}

// A owns a link to a resource only A saved and one to a resource both saved,
// both filed in one of A's collections, and one more link in A's inbox.
async function seed(): Promise<Seed> {
  const resources = keyed(
    await db
      .insert(resource)
      .values([
        { canonicalUrl: A_ONLY_URL, title: "Only A", kind: "page" },
        { canonicalUrl: SHARED_URL, title: "Shared page", kind: "page" },
        { canonicalUrl: "https://only-b.example/page", title: "Only B", kind: "page" },
        { canonicalUrl: A_INBOX_URL, title: "Inbox A", kind: "page" },
      ])
      .returning(),
    (row) => row.canonicalUrl,
  );
  const collections = keyed(
    await db
      .insert(collection)
      .values([
        { userId: a.id, name: `${A_MARKER} collection` },
        { userId: a.id, name: SHARED_NAME },
        { userId: b.id, name: "user-b collection" },
      ])
      .returning(),
    (row) => row.name,
  );
  const links = keyed(
    await db
      .insert(savedLink)
      .values([
        {
          userId: a.id,
          resourceId: resources(A_ONLY_URL).id,
          originalUrl: `${A_ONLY_URL}?by=${A_MARKER}`,
          titleOverride: A_TITLE,
          note: `${A_MARKER} note`,
          pinned: A_PINNED,
        },
        { userId: a.id, resourceId: resources(A_INBOX_URL).id, originalUrl: A_INBOX_URL, note: `${A_MARKER} inbox note` },
        { userId: a.id, resourceId: resources(SHARED_URL).id, originalUrl: `${SHARED_URL}?by=${A_MARKER}` },
        { userId: b.id, resourceId: resources(SHARED_URL).id, originalUrl: `${SHARED_URL}?by=user-b`, pinned: true },
        { userId: b.id, resourceId: resources("https://only-b.example/page").id, originalUrl: "https://only-b.example/page" },
      ])
      .returning(),
    (row) => row.originalUrl,
  );
  const aLink = links(`${A_ONLY_URL}?by=${A_MARKER}`);
  const aShared = links(`${SHARED_URL}?by=${A_MARKER}`);
  const aInbox = links(A_INBOX_URL);
  const bLink = links(`${SHARED_URL}?by=user-b`);
  const aCollection = collections(`${A_MARKER} collection`);
  const bCollection = collections("user-b collection");
  await db.insert(collectionItem).values([
    { collectionId: aCollection.id, savedLinkId: aLink.id },
    { collectionId: aCollection.id, savedLinkId: aShared.id },
    { collectionId: bCollection.id, savedLinkId: bLink.id },
  ]);
  return {
    a: { linkId: aLink.id, collectionId: aCollection.id },
    b: { linkId: bLink.id, collectionId: bCollection.id },
    // Resource ids are not secrets: resources are shared by everyone who saves the URL.
    secrets: [A_MARKER, aLink.id, aShared.id, aInbox.id, aCollection.id, collections(SHARED_NAME).id],
  };
}

// Everything A owns, including filings of A's links into anyone's collection.
async function rowsOfA() {
  return {
    links: await db.select().from(savedLink).where(eq(savedLink.userId, a.id)).orderBy(asc(savedLink.id)),
    collections: await db.select().from(collection).where(eq(collection.userId, a.id)).orderBy(asc(collection.id)),
    filings: await db
      .select({ collectionId: collectionItem.collectionId, linkId: collectionItem.savedLinkId })
      .from(collectionItem)
      .innerJoin(collection, eq(collection.id, collectionItem.collectionId))
      .innerJoin(savedLink, eq(savedLink.id, collectionItem.savedLinkId))
      .where(or(eq(collection.userId, a.id), eq(savedLink.userId, a.id)))
      .orderBy(asc(collectionItem.collectionId), asc(collectionItem.savedLinkId)),
  };
}

function methodOf(route: string): string {
  return route.slice(0, route.indexOf(" "));
}

async function send(app: App, method: string, { path, body }: Probe, user?: TestUser) {
  if (body === undefined) return app.request(path, { method, headers: { ...user?.headers } });
  const headers = { "Content-Type": "application/json", ...user?.headers };
  return app.request(path, { method, headers, body: JSON.stringify(body) });
}

function withIds(base: Ids, fields: readonly (keyof Ids)[], from: (field: keyof Ids) => string): Ids {
  return { ...base, ...Object.fromEntries(fields.map((field) => [field, from(field)])) };
}

// Each id on its own, then all of them together.
function swapSets(fields: readonly (keyof Ids)[]): (keyof Ids)[][] {
  const singles = fields.map((field) => [field]);
  return fields.length > 1 ? [...singles, [...fields]] : singles;
}

async function notFoundError(res: Response) {
  expect(res.status).toBe(404);
  const { error } = failureEnvelopeSchema.parse(await res.json());
  expect(error.code).toBe("NOT_FOUND");
  return error;
}

const caseList = Object.entries(cases);
const idCases = caseList.filter(([, { idFields }]) => idFields !== undefined);

describe("authz", () => {
  it.each(caseList)("%s rejects a request without a token", async (route, { request }) => {
    const res = await send(createTestApp(), methodOf(route), request({ linkId: randomUUID(), collectionId: randomUUID() }));

    expect(res.status).toBe(401);
    expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it.each(idCases)("%s answers another user's ids exactly as unknown ones", async (route, { request, idFields }) => {
    const app = createTestApp({ db });
    const ids = await seed();

    for (const fields of swapSets(idFields ?? [])) {
      const theirs = await send(app, methodOf(route), request(withIds(ids.b, fields, (field) => ids.a[field])), b);
      const unknown = await send(app, methodOf(route), request(withIds(ids.b, fields, () => randomUUID())), b);

      expect(await notFoundError(theirs), fields.join(" and ")).toEqual(await notFoundError(unknown));
    }
  });

  it.each(caseList)("%s shows another user none of A's rows", async (route, { request, listings }) => {
    const app = createTestApp({ db });
    const ids = await seed();
    const own = await send(app, methodOf(route), request(ids.b), b);
    const reads = await Promise.all((listings ?? []).map((path) => send(app, "GET", { path }, b)));

    for (const res of [own, ...reads]) {
      const text = await res.text();
      expect(res.ok, text).toBe(true);
      for (const secret of ids.secrets) expect(text).not.toContain(secret);
    }
  });

  it.each(caseList)("%s leaves A's rows unchanged whatever ids B sends", async (route, { request, idFields }) => {
    const app = createTestApp({ db });
    const ids = await seed();
    const before = await rowsOfA();

    for (const fields of [[], ...swapSets(idFields ?? [])]) {
      await send(app, methodOf(route), request(withIds(ids.b, fields, (field) => ids.a[field])), b);
    }

    expect(await rowsOfA()).toEqual(before);
  });

  it("answers a title cursor at another user's link exactly as one at an unknown link", async () => {
    const app = createTestApp({ db });
    const ids = await seed();
    const titleCursor = (id: string) => {
      const cursor = encodeCursor(cursorAt("title", { id, pinned: A_PINNED, titleKey: A_TITLE, cursorSavedAt: "" }));
      return send(app, "GET", { path: `/api/v1/links?sort=title&cursor=${cursor}` }, b);
    };

    const theirs = await titleCursor(ids.a.linkId);
    const unknown = await titleCursor(randomUUID());

    expect(theirs.status).toBe(400);
    const { error } = failureEnvelopeSchema.parse(await theirs.json());
    expect(error).toMatchObject({ code: "VALIDATION", message: "Cursor is no longer valid" });
    expect(error).toEqual(failureEnvelopeSchema.parse(await unknown.json()).error);
  });

  it.each(Object.entries(INSERT_ONLY_ROUTES))("%s takes no token and answers with no data", async (route, probe) => {
    const app = createTestApp({ db });
    const ids = await seed();

    // The first request and a repeat of it.
    for (const res of [await send(app, methodOf(route), probe), await send(app, methodOf(route), probe)]) {
      const text = await res.text();
      expect(successEnvelopeSchema(z.null()).parse(JSON.parse(text)).data).toBeNull();
      for (const secret of ids.secrets) expect(text).not.toContain(secret);
    }
  });

  it("GET /api/v1/shared/:token takes no token and shows B's shared collection with none of A's rows", async () => {
    const app = createTestApp({ db });
    const ids = await seed();
    const turnedOn = await send(app, "POST", { path: `/api/v1/collections/${ids.b.collectionId}/share` }, b);
    const { token } = successEnvelopeSchema(shareStateSchema).parse(await turnedOn.json()).data;

    const res = await send(app, "GET", { path: `/api/v1/shared/${String(token)}` });
    const text = await res.text();

    expect(successEnvelopeSchema(sharedCollectionSchema).parse(JSON.parse(text)).data.links).toHaveLength(1);
    for (const secret of [...ids.secrets, b.id, ids.b.collectionId, ids.b.linkId]) expect(text).not.toContain(secret);
  });

  it("knows what every public API route gives back", () => {
    const publicApiRoutes = [...PUBLIC_ROUTES].filter((route) => route.includes("/api/"));

    expect(publicApiRoutes).toEqual([...Object.keys(INSERT_ONLY_ROUTES), ...SHARED_READ_ROUTES]);
  });

  it("has a case for every registered route", () => {
    expect(unlistedRoutes(createTestApp())).toEqual([]);
  });

  it("has no case for a route that is not registered", () => {
    const registered = registeredRoutes(createTestApp());

    expect(Object.keys(cases).filter((route) => !registered.includes(route))).toEqual([]);
  });

  it("flags a registered route that has no case", () => {
    const app = createTestApp();
    app.post("/api/v1/unlisted", (c) => c.body(null));

    expect(unlistedRoutes(app)).toContain("POST /api/v1/unlisted");
  });
});
