import { randomUUID } from "node:crypto";
import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { sharedCollectionSchema, shareStateSchema, VIEWER_SESSION_HEADER, viewerSessionSchema } from "@linkables/shared/sharing";
import { asc, eq, or } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  collection,
  collectionGroup,
  collectionItem,
  resource,
  savedLink,
  shareAllowedEmail,
  shareCode,
  shareViewerSession,
} from "../src/db/schema";
import { encodeCursor } from "../src/links/cursor";
import { cursorAt } from "../src/links/sort";
import { createTestApp, testUsers, type TestUser } from "./app";
import { connectTestDb, truncateAll } from "./db";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

type App = ReturnType<typeof createTestApp>;
type Ids = { linkId: string; collectionId: string; groupId: string };
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
const A_SHARE_TOKEN = "User-A-Share-Token-0123456789abc";
// A's collection is private and lists this address, which carries the marker so any leak of it shows.
const A_FRIEND = `${A_MARKER}-friend@example.com`;

// Every route except the public ones below. A new route adds a case here and a
// two-user test beside its source.
const cases: Record<string, Case> = {
  "GET /api/v1/me": { request: () => ({ path: "/api/v1/me" }) },
  // B deleting B's own account must leave every row of A's in place.
  "DELETE /api/v1/me": { request: () => ({ path: "/api/v1/me" }) },
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
  "GET /api/v1/collections/:id/groups": {
    request: ({ collectionId }) => ({ path: `/api/v1/collections/${collectionId}/groups` }),
    idFields: ["collectionId"],
  },
  "POST /api/v1/collections/:id/groups": {
    request: ({ collectionId }) => ({ path: `/api/v1/collections/${collectionId}/groups`, body: { name: SHARED_NAME } }),
    idFields: ["collectionId"],
  },
  "PUT /api/v1/collections/:id/groups/order": {
    request: ({ collectionId, groupId }) => ({
      path: `/api/v1/collections/${collectionId}/groups/order`,
      body: { ids: [groupId] },
    }),
    idFields: ["collectionId"],
  },
  "PATCH /api/v1/collections/:id/groups/:groupId": {
    request: ({ collectionId, groupId }) => ({
      path: `/api/v1/collections/${collectionId}/groups/${groupId}`,
      body: { name: "changed by b" },
    }),
    idFields: ["collectionId", "groupId"],
  },
  "DELETE /api/v1/collections/:id/groups/:groupId": {
    request: ({ collectionId, groupId }) => ({ path: `/api/v1/collections/${collectionId}/groups/${groupId}` }),
    idFields: ["collectionId", "groupId"],
  },
  "PATCH /api/v1/collections/:id/links/:linkId": {
    request: ({ collectionId, linkId, groupId }) => ({
      path: `/api/v1/collections/${collectionId}/links/${linkId}`,
      body: { groupId },
    }),
    idFields: ["collectionId", "linkId", "groupId"],
  },
  "GET /api/v1/export": { request: () => ({ path: "/api/v1/export" }) },
  // Mints a sign-in token for the caller only; B must get none of A's.
  "POST /api/v1/extension-sessions": { request: () => ({ path: "/api/v1/extension-sessions" }) },
  "GET /api/v1/collections/shared": { request: () => ({ path: "/api/v1/collections/shared" }) },
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
  "PUT /api/v1/collections/:id/share/scope": {
    request: ({ collectionId, groupId }) => ({
      path: `/api/v1/collections/${collectionId}/share/scope`,
      body: { ungrouped: false, groupIds: [groupId] },
    }),
    idFields: ["collectionId", "groupId"],
  },
  "GET /api/v1/collections/:id/share/access": {
    request: ({ collectionId }) => ({ path: `/api/v1/collections/${collectionId}/share/access` }),
    idFields: ["collectionId"],
  },
  "PUT /api/v1/collections/:id/share/access": {
    request: ({ collectionId }) => ({
      path: `/api/v1/collections/${collectionId}/share/access`,
      body: { mode: "emails", emails: ["b-friend@example.com"] },
    }),
    idFields: ["collectionId"],
  },
};

// Public on purpose (Rule 3): the health check, the request-access form, which
// only inserts, a shared collection, which reads only the one collection its
// owner turned a link on for, and only the groups the owner chose to show in it,
// and the two routes a viewer of an emails-only share signs in with, which answer
// the same for every address and hand out a session for that one collection.
// Each public API route is probed below for what it gives back.
const PUBLIC_ROUTES = new Set([
  "GET /health",
  "POST /api/v1/access-requests",
  "GET /api/v1/shared/:token",
  "POST /api/v1/shared/:token/code",
  "POST /api/v1/shared/:token/verify",
]);

const INSERT_ONLY_ROUTES: Record<string, Probe> = {
  "POST /api/v1/access-requests": { path: "/api/v1/access-requests", body: { email: "b@example.com", name: "B" } },
};

const SHARED_READ_ROUTES = ["GET /api/v1/shared/:token"];

const VIEWER_SIGN_IN_ROUTES = ["POST /api/v1/shared/:token/code", "POST /api/v1/shared/:token/verify"];

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
// That collection's share link is on, so a listing of shared collections has A's to leak.
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
        { userId: a.id, name: `${A_MARKER} collection`, shareToken: A_SHARE_TOKEN, sharePrivate: true },
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
  const [aGroup, bGroup] = await db
    .insert(collectionGroup)
    .values([
      { collectionId: aCollection.id, name: `${A_MARKER} group`, position: 0 },
      { collectionId: bCollection.id, name: "user-b group", position: 0 },
    ])
    .returning();
  if (aGroup === undefined || bGroup === undefined) throw new Error("groups were not inserted");
  await db.insert(collectionItem).values([
    { collectionId: aCollection.id, savedLinkId: aLink.id, groupId: aGroup.id },
    { collectionId: aCollection.id, savedLinkId: aShared.id },
    { collectionId: bCollection.id, savedLinkId: bLink.id, groupId: bGroup.id },
  ]);
  await db.insert(shareAllowedEmail).values({ collectionId: aCollection.id, email: A_FRIEND });
  await db.insert(shareCode).values({ collectionId: aCollection.id, email: A_FRIEND, salt: "s", codeHash: "h", expiresAt: new Date(Date.now() + 60_000) });
  await db.insert(shareViewerSession).values({ tokenHash: "t", collectionId: aCollection.id, email: A_FRIEND, expiresAt: new Date(Date.now() + 60_000) });
  return {
    a: { linkId: aLink.id, collectionId: aCollection.id, groupId: aGroup.id },
    b: { linkId: bLink.id, collectionId: bCollection.id, groupId: bGroup.id },
    // Resource ids are not secrets: resources are shared by everyone who saves the URL.
    secrets: [A_MARKER, A_SHARE_TOKEN, aLink.id, aShared.id, aInbox.id, aCollection.id, aGroup.id, collections(SHARED_NAME).id],
  };
}

// Everything A owns, including filings of A's links into anyone's collection.
async function rowsOfA() {
  return {
    links: await db.select().from(savedLink).where(eq(savedLink.userId, a.id)).orderBy(asc(savedLink.id)),
    collections: await db.select().from(collection).where(eq(collection.userId, a.id)).orderBy(asc(collection.id)),
    allowedEmails: await db
      .select({ row: shareAllowedEmail })
      .from(shareAllowedEmail)
      .innerJoin(collection, eq(collection.id, shareAllowedEmail.collectionId))
      .where(eq(collection.userId, a.id)),
    codes: await db
      .select({ row: shareCode })
      .from(shareCode)
      .innerJoin(collection, eq(collection.id, shareCode.collectionId))
      .where(eq(collection.userId, a.id)),
    sessions: await db
      .select({ row: shareViewerSession })
      .from(shareViewerSession)
      .innerJoin(collection, eq(collection.id, shareViewerSession.collectionId))
      .where(eq(collection.userId, a.id)),
    groups: await db
      .select({ group: collectionGroup })
      .from(collectionGroup)
      .innerJoin(collection, eq(collection.id, collectionGroup.collectionId))
      .where(eq(collection.userId, a.id))
      .orderBy(asc(collectionGroup.id)),
    filings: await db
      .select({
        collectionId: collectionItem.collectionId,
        linkId: collectionItem.savedLinkId,
        groupId: collectionItem.groupId,
      })
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
    const res = await send(createTestApp(), methodOf(route), request({ linkId: randomUUID(), collectionId: randomUUID(), groupId: randomUUID() }));

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

    const shown = successEnvelopeSchema(sharedCollectionSchema).parse(JSON.parse(text)).data;
    expect(shown.groups?.map((group) => group.links.length)).toEqual([1]);
    expect(shown.links).toEqual([]);
    for (const secret of [...ids.secrets, b.id, ids.b.collectionId, ids.b.linkId]) expect(text).not.toContain(secret);
  });

  describe("GET /api/v1/shared/:token with groups", () => {
    const HIDDEN_GROUP = "b-hidden-group";
    const HIDDEN_URL = "https://hidden.example/in-hidden-group";
    const UNGROUPED_URL = "https://ungrouped.example/loose";

    async function insertBLink(url: string, collectionId: string, groupId: string | null) {
      const [res] = await db.insert(resource).values({ canonicalUrl: url, title: url, kind: "page" }).returning();
      if (res === undefined) throw new Error("no resource");
      const [link] = await db.insert(savedLink).values({ userId: b.id, resourceId: res.id, originalUrl: url }).returning();
      if (link === undefined) throw new Error("no link");
      await db.insert(collectionItem).values({ collectionId, savedLinkId: link.id, groupId });
      return link;
    }

    // B shares a collection with a shared group, an unshared one and a loose link.
    async function shareB(app: App, ids: Seed) {
      const [hidden] = await db
        .insert(collectionGroup)
        .values({ collectionId: ids.b.collectionId, name: HIDDEN_GROUP, position: 1, shared: false })
        .returning();
      if (hidden === undefined) throw new Error("no group");
      await insertBLink(HIDDEN_URL, ids.b.collectionId, hidden.id);
      await insertBLink(UNGROUPED_URL, ids.b.collectionId, null);
      const turnedOn = await send(app, "POST", { path: `/api/v1/collections/${ids.b.collectionId}/share` }, b);
      const { token } = successEnvelopeSchema(shareStateSchema).parse(await turnedOn.json()).data;
      return String(token);
    }

    async function publicView(app: App, token: string) {
      const text = await (await send(app, "GET", { path: `/api/v1/shared/${token}` })).text();
      return { text, data: successEnvelopeSchema(sharedCollectionSchema).parse(JSON.parse(text)).data };
    }

    it("shows a group the owner left out nowhere: not its name, its links or its count", async () => {
      const app = createTestApp({ db });
      const ids = await seed();
      const token = await shareB(app, ids);

      const { text, data } = await publicView(app, token);

      expect(data.groups?.map((group) => group.name)).toEqual(["user-b group"]);
      expect(data.linkCount).toBe(2);
      for (const trace of [HIDDEN_GROUP, "hidden.example"]) expect(text).not.toContain(trace);
    });

    it("leaves out the ungrouped links when the owner switched them off", async () => {
      const app = createTestApp({ db });
      const ids = await seed();
      const token = await shareB(app, ids);
      await db.update(collection).set({ shareUngrouped: false }).where(eq(collection.id, ids.b.collectionId));

      const { text, data } = await publicView(app, token);

      expect(data.links).toEqual([]);
      expect(data.groups?.map((group) => group.name)).toEqual(["user-b group"]);
      expect(text).not.toContain("ungrouped.example");
    });

    it("judges one link by each collection's own group: shown in the one that shares it, hidden in the one that does not", async () => {
      const app = createTestApp({ db });
      const ids = await seed();
      const token = await shareB(app, ids);
      const [other] = await db.insert(collection).values({ userId: b.id, name: "Elsewhere" }).returning();
      if (other === undefined) throw new Error("no collection");
      const [secret] = await db.insert(collectionGroup).values({ collectionId: other.id, name: "Secret", position: 0, shared: false }).returning();
      if (secret === undefined) throw new Error("no group");
      await db.insert(collectionItem).values({ collectionId: other.id, savedLinkId: ids.b.linkId, groupId: secret.id });

      const turnedOn = await send(app, "POST", { path: `/api/v1/collections/${other.id}/share` }, b);
      const elsewhereToken = String(successEnvelopeSchema(shareStateSchema).parse(await turnedOn.json()).data.token);

      const main = await publicView(app, token);
      const elsewhere = await publicView(app, elsewhereToken);

      expect(main.data.groups?.find((group) => group.name === "user-b group")?.links).toHaveLength(1);
      expect(elsewhere.data.groups).toBeUndefined();
      expect(elsewhere.data.linkCount).toBe(0);
      expect(elsewhere.text).not.toContain("Secret");
    });

    it("hides a shared group with no links, and answers an unknown token as before", async () => {
      const app = createTestApp({ db });
      const ids = await seed();
      const token = await shareB(app, ids);
      await db.insert(collectionGroup).values({ collectionId: ids.b.collectionId, name: "empty-group", position: 2 });

      const { text } = await publicView(app, token);
      const unknown = await send(app, "GET", { path: `/api/v1/shared/${"A".repeat(token.length)}` });
      await send(app, "DELETE", { path: `/api/v1/collections/${ids.b.collectionId}/share` }, b);
      const off = await send(app, "GET", { path: `/api/v1/shared/${token}` });

      expect(text).not.toContain("empty-group");
      expect(await notFoundError(off)).toEqual(await notFoundError(unknown));
    });
  });

  describe("emails-only shares", () => {
    const B_VIEWER = "viewer@example.com";
    const OUTSIDER = "outsider@example.com";

    function mailCapture() {
      const sent: { to: string; code: string }[] = [];
      const sendViewerCode = (message: { to: string; code: string }) => {
        sent.push(message);
        return Promise.resolve();
      };
      return { sent, app: createTestApp({ db, sendViewerCode }) };
    }

    // B limits a collection to one address; A's is limited to A_FRIEND in the seed.
    async function privateB(app: App, ids: Seed) {
      const turnedOn = await send(app, "POST", { path: `/api/v1/collections/${ids.b.collectionId}/share` }, b);
      const token = String(successEnvelopeSchema(shareStateSchema).parse(await turnedOn.json()).data.token);
      const put = await send(app, "PUT", { path: `/api/v1/collections/${ids.b.collectionId}/share/access`, body: { mode: "emails", emails: [B_VIEWER] } }, b);
      expect(put.status).toBe(200);
      return token;
    }

    const asViewer = (path: string, body: unknown) => send(createTestApp({ db }), "POST", { path, body });

    it("shows nothing of A's private collection, not even its name, to anyone without a session", async () => {
      const { app } = mailCapture();
      const ids = await seed();

      const res = await send(app, "GET", { path: `/api/v1/shared/${A_SHARE_TOKEN}` });
      const text = await res.text();

      expect(res.status).toBe(403);
      for (const secret of ids.secrets.filter((s) => s !== A_SHARE_TOKEN)) expect(text).not.toContain(secret);
    });

    it("answers the same, and sends nothing, for an address that is not listed", async () => {
      const { app, sent } = mailCapture();
      const ids = await seed();

      const ask = async (email: string) => (await send(app, "POST", { path: `/api/v1/shared/${A_SHARE_TOKEN}/code`, body: { email } })).text();
      const texts = [await ask(A_FRIEND), await ask(OUTSIDER)];

      expect(sent.map((m) => m.to)).toEqual([A_FRIEND]);
      for (const text of texts) {
        expect(successEnvelopeSchema(z.null()).parse(JSON.parse(text)).data).toBeNull();
        for (const secret of ids.secrets) expect(text).not.toContain(secret);
      }
    });

    it("never shows content to an address that is not listed, whatever code it tries", async () => {
      const { app, sent } = mailCapture();
      const ids = await seed();
      const token = await privateB(app, ids);
      await send(app, "POST", { path: `/api/v1/shared/${token}/code`, body: { email: B_VIEWER } });
      const real = sent[0]?.code ?? "";

      const res = await send(app, "POST", { path: `/api/v1/shared/${token}/verify`, body: { email: OUTSIDER, code: real } });
      const text = await res.text();

      expect(res.status).toBe(403);
      expect(text).not.toContain("user-b collection");
      expect(text).not.toContain("session");
    });

    it("gives a session for one collection only: B's viewer cannot open A's", async () => {
      const { app, sent } = mailCapture();
      const ids = await seed();
      const token = await privateB(app, ids);
      await send(app, "POST", { path: `/api/v1/shared/${token}/code`, body: { email: B_VIEWER } });
      const verified = await send(app, "POST", { path: `/api/v1/shared/${token}/verify`, body: { email: B_VIEWER, code: sent[0]?.code ?? "" } });
      const { session } = successEnvelopeSchema(viewerSessionSchema).parse(await verified.json()).data;

      const own = await app.request(`/api/v1/shared/${token}`, { headers: { [VIEWER_SESSION_HEADER]: session } });
      const theirs = await app.request(`/api/v1/shared/${A_SHARE_TOKEN}`, { headers: { [VIEWER_SESSION_HEADER]: session } });
      const text = await theirs.text();

      expect(own.status).toBe(200);
      expect(theirs.status).toBe(403);
      for (const secret of ids.secrets.filter((s) => s !== A_SHARE_TOKEN)) expect(text).not.toContain(secret);
    });

    it("leaves A's list, codes and sessions alone whatever B does with B's own share", async () => {
      const { app, sent } = mailCapture();
      const ids = await seed();
      const before = await rowsOfA();
      const token = await privateB(app, ids);
      await send(app, "POST", { path: `/api/v1/shared/${token}/code`, body: { email: B_VIEWER } });
      await send(app, "POST", { path: `/api/v1/shared/${token}/verify`, body: { email: B_VIEWER, code: sent[0]?.code ?? "" } });
      await send(app, "DELETE", { path: `/api/v1/collections/${ids.b.collectionId}/share` }, b);

      expect(await rowsOfA()).toEqual(before);
      expect((await asViewer(`/api/v1/shared/${A_SHARE_TOKEN}/verify`, { email: OUTSIDER, code: "000000" })).status).toBe(403);
    });
  });

  it("knows what every public API route gives back", () => {
    const publicApiRoutes = [...PUBLIC_ROUTES].filter((route) => route.includes("/api/"));

    expect(publicApiRoutes).toEqual([...Object.keys(INSERT_ONLY_ROUTES), ...SHARED_READ_ROUTES, ...VIEWER_SIGN_IN_ROUTES]);
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
