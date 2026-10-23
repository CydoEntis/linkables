import { collectionSchema, listCollectionsResponseSchema } from "@linkables/shared/collections";
import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { listLinksResponseSchema, saveLinkResponseSchema } from "@linkables/shared/links";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const app = createTestApp({ db });

function send(user: TestUser, method: string, path: string, body?: unknown) {
  return app.request(`/api/v1${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...user.headers },
    body: body === undefined ? null : JSON.stringify(body),
  });
}

async function createCollection(user: TestUser, name = "Reading") {
  const res = await send(user, "POST", "/collections", { name });
  return successEnvelopeSchema(collectionSchema).parse(await res.json()).data.id;
}

async function saveLink(user: TestUser, url = "https://example.com/post") {
  const res = await send(user, "POST", "/links", { url });
  return successEnvelopeSchema(saveLinkResponseSchema).parse(await res.json()).data.id;
}

async function linkIds(user: TestUser, query = "") {
  const res = await send(user, "GET", `/links?${query}`);
  return successEnvelopeSchema(listLinksResponseSchema)
    .parse(await res.json())
    .data.items.map((item) => item.id);
}

async function expectStatus(res: Response, status: number) {
  expect(res.status).toBe(status);
  const body: unknown = await res.json();
  if (status === 404) expect(failureEnvelopeSchema.parse(body).error.code).toBe("NOT_FOUND");
  else expect(successEnvelopeSchema(z.null()).parse(body).data).toBeNull();
}

const LONG_AGO = new Date("2020-01-01T00:00:00.000Z");

async function lastUsedLongAgo(col: string) {
  await db.update(collection).set({ lastUsedAt: LONG_AGO }).where(eq(collection.id, col));
}

async function lastUsedAt(user: TestUser, col: string) {
  const res = await send(user, "GET", "/collections");
  const items = successEnvelopeSchema(listCollectionsResponseSchema).parse(await res.json()).data.items;
  return new Date(items.find((item) => item.id === col)?.lastUsedAt ?? Number.NaN);
}

const add = (user: TestUser, col: string, link: string) => send(user, "PUT", `/collections/${col}/links/${link}`);
const remove = (user: TestUser, col: string, link: string) =>
  send(user, "DELETE", `/collections/${col}/links/${link}`);

describe("collection membership", () => {
  it("adding a link to a collection removes it from the inbox", async () => {
    const link = await saveLink(a);
    const col = await createCollection(a);

    await expectStatus(await add(a, col, link), 200);

    expect(await linkIds(a, "view=inbox")).toEqual([]);
    expect(await linkIds(a)).toEqual([link]);
  });

  it("adding a link that is already in the collection succeeds", async () => {
    const link = await saveLink(a);
    const col = await createCollection(a);
    await add(a, col, link);

    await expectStatus(await add(a, col, link), 200);
  });

  it("removing a link from its last collection returns it to the inbox", async () => {
    const link = await saveLink(a);
    const reading = await createCollection(a, "Reading");
    const later = await createCollection(a, "Later");
    await add(a, reading, link);
    await add(a, later, link);

    await expectStatus(await remove(a, reading, link), 200);
    expect(await linkIds(a, "view=inbox")).toEqual([]);

    await expectStatus(await remove(a, later, link), 200);
    expect(await linkIds(a, "view=inbox")).toEqual([link]);
  });

  it("removing a link that is not in the collection succeeds", async () => {
    const link = await saveLink(a);
    const col = await createCollection(a);

    await expectStatus(await remove(a, col, link), 200);
  });

  it("deleting a collection keeps its links and returns them to the inbox", async () => {
    const link = await saveLink(a);
    const col = await createCollection(a);
    await add(a, col, link);

    await send(a, "DELETE", `/collections/${col}`);

    expect(await linkIds(a, "view=inbox")).toEqual([link]);
  });

  it("returns NOT_FOUND when a user adds another user's link to their own collection", async () => {
    const aLink = await saveLink(a);
    const bCol = await createCollection(b);

    await expectStatus(await add(b, bCol, aLink), 404);
    await expectStatus(await remove(b, bCol, aLink), 404);
  });

  it("returns NOT_FOUND when a user adds their own link to another user's collection", async () => {
    const aCol = await createCollection(a);
    const bLink = await saveLink(b);

    await expectStatus(await add(b, aCol, bLink), 404);
    await expectStatus(await remove(b, aCol, bLink), 404);
  });

  it("does not let another user remove a link from a collection", async () => {
    const link = await saveLink(a);
    const col = await createCollection(a);
    await add(a, col, link);

    await expectStatus(await remove(b, col, link), 404);

    expect(await linkIds(a, "view=inbox")).toEqual([]);
  });

  it("adding a link marks the collection as just used", async () => {
    const link = await saveLink(a);
    const col = await createCollection(a);
    await lastUsedLongAgo(col);

    await add(a, col, link);

    expect(await lastUsedAt(a, col)).not.toEqual(LONG_AGO);
  });

  it("removing a link marks the collection as just used", async () => {
    const link = await saveLink(a);
    const col = await createCollection(a);
    await add(a, col, link);
    await lastUsedLongAgo(col);

    await remove(a, col, link);

    expect(await lastUsedAt(a, col)).not.toEqual(LONG_AGO);
  });

  it("saving a link into a collection marks it as just used", async () => {
    const col = await createCollection(a);
    await lastUsedLongAgo(col);

    await send(a, "POST", "/links", { url: "https://example.com/post", collectionId: col });

    expect(await lastUsedAt(a, col)).not.toEqual(LONG_AGO);
  });

  it("filing a link that is already in the collection leaves its last use alone", async () => {
    const link = await saveLink(a);
    const col = await createCollection(a);
    await add(a, col, link);
    await lastUsedLongAgo(col);

    await add(a, col, link);
    await send(a, "POST", "/links", { url: "https://example.com/post", collectionId: col });

    expect(await lastUsedAt(a, col)).toEqual(LONG_AGO);
  });

  it("removing a link that is not in the collection leaves its last use alone", async () => {
    const link = await saveLink(a);
    const col = await createCollection(a);
    await lastUsedLongAgo(col);

    await remove(a, col, link);

    expect(await lastUsedAt(a, col)).toEqual(LONG_AGO);
  });
});
