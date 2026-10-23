import { successEnvelopeSchema } from "@linkables/shared/http";
import { listLinksResponseSchema, savedLinkSchema, saveLinkResponseSchema } from "@linkables/shared/links";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionItem } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const app = createTestApp({ db });
const URL = "https://example.com/post";

function post(user: TestUser, body: Record<string, unknown>) {
  return app.request("/api/v1/links", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...user.headers },
    body: JSON.stringify(body),
  });
}

async function save(user: TestUser, body: Record<string, unknown> = { url: URL }) {
  const res = await post(user, body);
  expect(res.status).toBeLessThan(300);
  return successEnvelopeSchema(saveLinkResponseSchema).parse(await res.json()).data;
}

async function list(user: TestUser) {
  const res = await app.request("/api/v1/links", { headers: user.headers });
  return successEnvelopeSchema(listLinksResponseSchema).parse(await res.json()).data.items;
}

async function patch(user: TestUser, id: string) {
  const res = await app.request(`/api/v1/links/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...user.headers },
    body: JSON.stringify({ pinned: true }),
  });
  return successEnvelopeSchema(savedLinkSchema).parse(await res.json()).data;
}

async function createCollection(user: TestUser, name: string) {
  const [row] = await db
    .insert(collection)
    .values({ userId: user.id, name })
    .returning({ id: collection.id, name: collection.name });
  if (row === undefined) throw new Error("insert returned no row");
  return row;
}

async function file(linkId: string, collectionIds: string[]) {
  await db.insert(collectionItem).values(collectionIds.map((collectionId) => ({ collectionId, savedLinkId: linkId })));
}

describe("a link's collections", () => {
  it("lists exactly the caller's collections ordered by name ignoring case", async () => {
    const link = await save(a);
    const rust = await createCollection(a, "rust");
    const apple = await createCollection(a, "Apple");
    const zed = await createCollection(a, "Zed");
    await createCollection(a, "Unused");
    await file(link.id, [rust.id, apple.id, zed.id]);

    const [item] = await list(a);

    expect(item?.collections).toEqual([apple, rust, zed]);
  });

  it("is empty for a link in no collection", async () => {
    await save(a);

    const [item] = await list(a);

    expect(item?.collections).toEqual([]);
  });

  it("comes back on the save that files the link", async () => {
    const rust = await createCollection(a, "Rust");

    const link = await save(a, { url: URL, collectionId: rust.id });

    expect(link.collections).toEqual([rust]);
  });

  it("comes back on a duplicate save with the existing link", async () => {
    const first = await save(a);
    const rust = await createCollection(a, "Rust");
    await file(first.id, [rust.id]);

    const again = await save(a);

    expect(again).toMatchObject({ id: first.id, duplicate: true, collections: [rust] });
  });

  it("comes back on an edit", async () => {
    const link = await save(a);
    const rust = await createCollection(a, "Rust");
    await file(link.id, [rust.id]);

    expect((await patch(a, link.id)).collections).toEqual([rust]);
  });

  it("never shows another user's collection that holds the same resource", async () => {
    const theirs = await save(a);
    const secret = await createCollection(a, "user-a secret");
    await file(theirs.id, [secret.id]);

    const mine = await save(b);

    expect(mine.collections).toEqual([]);
    expect((await list(b))[0]?.collections).toEqual([]);
    expect((await patch(b, mine.id)).collections).toEqual([]);
  });

  it("never shows another user's collection even when it holds the caller's link", async () => {
    const mine = await save(b);
    const secret = await createCollection(a, "user-a secret");
    const own = await createCollection(b, "Mine");
    await file(mine.id, [secret.id, own.id]);

    expect((await list(b))[0]?.collections).toEqual([own]);
    expect((await patch(b, mine.id)).collections).toEqual([own]);
    expect((await save(b)).collections).toEqual([own]);
  });
});
