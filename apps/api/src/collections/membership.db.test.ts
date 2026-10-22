import { collectionSchema } from "@linkaroo/shared/collections";
import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkaroo/shared/http";
import { listLinksResponseSchema, saveLinkResponseSchema } from "@linkaroo/shared/links";
import { z } from "zod";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";

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
});
