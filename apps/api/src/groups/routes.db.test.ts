import { randomUUID } from "node:crypto";
import { COLLECTION_GROUPS_MAX, GROUP_NAME_MAX_LENGTH, groupSchema, listGroupsResponseSchema } from "@linkables/shared/groups";
import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { listLinksResponseSchema, saveLinkResponseSchema } from "@linkables/shared/links";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionGroup, collectionItem } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const app = createTestApp({ db });

async function send(user: TestUser, method: string, path: string, body?: unknown) {
  return await app.request(`/api/v1${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...user.headers },
    body: body === undefined ? null : JSON.stringify(body),
  });
}

async function data<T extends z.ZodType>(res: Response, schema: T): Promise<z.output<T>> {
  return schema.parse(successEnvelopeSchema(z.unknown()).parse(await res.json()).data);
}

async function failure(res: Response) {
  return failureEnvelopeSchema.parse(await res.json()).error;
}

async function newCollection(user: TestUser, name = "Reading") {
  const [row] = await db.insert(collection).values({ userId: user.id, name }).returning({ id: collection.id });
  if (row === undefined) throw new Error("insert returned no row");
  return row.id;
}

async function newGroup(user: TestUser, collectionId: string, name: string) {
  const res = await send(user, "POST", `/collections/${collectionId}/groups`, { name });
  expect(res.status).toBe(201);
  return data(res, groupSchema);
}

async function groups(user: TestUser, collectionId: string) {
  const res = await send(user, "GET", `/collections/${collectionId}/groups`);
  expect(res.status).toBe(200);
  return (await data(res, listGroupsResponseSchema)).items;
}

async function saveLink(user: TestUser, url: string, collectionId?: string) {
  const res = await send(user, "POST", "/links", { url, collectionId });
  return (await data(res, saveLinkResponseSchema)).id;
}

async function listLinks(user: TestUser, query: string) {
  const res = await send(user, "GET", `/links?${query}`);
  expect(res.status).toBe(200);
  return data(res, listLinksResponseSchema);
}

async function move(user: TestUser, collectionId: string, linkId: string, groupId: string | null) {
  return send(user, "PATCH", `/collections/${collectionId}/links/${linkId}`, { groupId });
}

describe("creating a group", () => {
  it("adds it after the existing ones, empty and shared", async () => {
    const collectionId = await newCollection(a);

    await newGroup(a, collectionId, "Later");
    const second = await newGroup(a, collectionId, "  Now  ");

    expect(second).toMatchObject({ name: "Now", position: 1, shared: true, linkCount: 0 });
    expect((await groups(a, collectionId)).map((group) => group.name)).toEqual(["Later", "Now"]);
  });

  it.each([
    ["an empty name", { name: "   " }],
    ["a name over the limit", { name: "x".repeat(GROUP_NAME_MAX_LENGTH + 1) }],
    ["no name", {}],
    ["an unknown field", { name: "Ok", shared: false }],
  ])("rejects %s", async (_label, body) => {
    const collectionId = await newCollection(a);

    const res = await send(a, "POST", `/collections/${collectionId}/groups`, body);

    expect(res.status).toBe(400);
    expect((await failure(res)).code).toBe("VALIDATION");
  });

  it("accepts a name of exactly the limit", async () => {
    const collectionId = await newCollection(a);

    const group = await newGroup(a, collectionId, "x".repeat(GROUP_NAME_MAX_LENGTH));

    expect(group.name).toHaveLength(GROUP_NAME_MAX_LENGTH);
  });

  it("refuses a duplicate name ignoring case with CONFLICT", async () => {
    const collectionId = await newCollection(a);
    await newGroup(a, collectionId, "Recipes");

    const res = await send(a, "POST", `/collections/${collectionId}/groups`, { name: "rECIPES" });

    expect(res.status).toBe(409);
    expect((await failure(res)).code).toBe("CONFLICT");
  });

  it("allows the same name in another collection", async () => {
    const first = await newCollection(a, "One");
    const second = await newCollection(a, "Two");
    await newGroup(a, first, "Recipes");

    expect((await newGroup(a, second, "Recipes")).name).toBe("Recipes");
  });

  it("refuses the group past the limit with CONFLICT", async () => {
    const collectionId = await newCollection(a);
    for (let n = 0; n < COLLECTION_GROUPS_MAX; n += 1) await newGroup(a, collectionId, `Group ${String(n)}`);

    const res = await send(a, "POST", `/collections/${collectionId}/groups`, { name: "One too many" });

    expect(res.status).toBe(409);
    expect((await failure(res)).code).toBe("CONFLICT");
    expect(await groups(a, collectionId)).toHaveLength(COLLECTION_GROUPS_MAX);
  });

  it("keeps to the limit when creates race", async () => {
    const collectionId = await newCollection(a);
    for (let n = 0; n < COLLECTION_GROUPS_MAX - 1; n += 1) await newGroup(a, collectionId, `Group ${String(n)}`);

    const results = await Promise.all(
      ["Race 1", "Race 2", "Race 3"].map((name) => send(a, "POST", `/collections/${collectionId}/groups`, { name })),
    );

    expect(results.map((res) => res.status).sort()).toEqual([201, 409, 409]);
    expect(await groups(a, collectionId)).toHaveLength(COLLECTION_GROUPS_MAX);
  });
});

describe("renaming a group", () => {
  it("changes the name and keeps the place", async () => {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Old");

    const res = await send(a, "PATCH", `/collections/${collectionId}/groups/${group.id}`, { name: " New " });

    expect(await data(res, groupSchema)).toMatchObject({ id: group.id, name: "New", position: 0 });
  });

  it("allows changing only the case of its own name", async () => {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "recipes");

    const res = await send(a, "PATCH", `/collections/${collectionId}/groups/${group.id}`, { name: "Recipes" });

    expect((await data(res, groupSchema)).name).toBe("Recipes");
  });

  it("refuses another group's name with CONFLICT", async () => {
    const collectionId = await newCollection(a);
    await newGroup(a, collectionId, "Taken");
    const group = await newGroup(a, collectionId, "Mine");

    const res = await send(a, "PATCH", `/collections/${collectionId}/groups/${group.id}`, { name: "taken" });

    expect(res.status).toBe(409);
    expect((await failure(res)).code).toBe("CONFLICT");
  });

  it("rejects an empty name", async () => {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Mine");

    const res = await send(a, "PATCH", `/collections/${collectionId}/groups/${group.id}`, { name: "" });

    expect((await failure(res)).code).toBe("VALIDATION");
  });

  it("answers NOT_FOUND for a group of another collection of the same user", async () => {
    const first = await newCollection(a, "One");
    const second = await newCollection(a, "Two");
    const group = await newGroup(a, first, "Mine");

    const res = await send(a, "PATCH", `/collections/${second}/groups/${group.id}`, { name: "Moved" });

    expect(res.status).toBe(404);
  });
});

describe("listing groups", () => {
  it("counts each group's links and leaves out another user's filings", async () => {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Recipes");
    const one = await saveLink(a, "https://example.com/one", collectionId);
    await saveLink(a, "https://example.com/two", collectionId);
    await move(a, collectionId, one, group.id);

    const items = await groups(a, collectionId);

    expect(items).toEqual([{ ...group, linkCount: 1 }]);
  });

  it("is NOT_FOUND for an unknown collection", async () => {
    const res = await send(a, "GET", `/collections/${randomUUID()}/groups`);

    expect(res.status).toBe(404);
  });
});

describe("deleting a group", () => {
  it("returns data null and leaves its links in the collection, ungrouped", async () => {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Recipes");
    const linkId = await saveLink(a, "https://example.com/one", collectionId);
    await move(a, collectionId, linkId, group.id);

    const res = await send(a, "DELETE", `/collections/${collectionId}/groups/${group.id}`);

    expect(res.status).toBe(200);
    expect(successEnvelopeSchema(z.null()).parse(await res.json()).data).toBeNull();
    expect(await groups(a, collectionId)).toEqual([]);
    const ungrouped = await listLinks(a, `collectionId=${collectionId}&groupId=none`);
    expect(ungrouped.items.map((item) => item.id)).toEqual([linkId]);
  });

  it("closes up the positions of the groups left", async () => {
    const collectionId = await newCollection(a);
    await newGroup(a, collectionId, "One");
    const two = await newGroup(a, collectionId, "Two");
    await newGroup(a, collectionId, "Three");

    await send(a, "DELETE", `/collections/${collectionId}/groups/${two.id}`);

    expect((await groups(a, collectionId)).map((group) => [group.name, group.position])).toEqual([
      ["One", 0],
      ["Three", 1],
    ]);
  });

  it("does not touch the same link's group in another collection", async () => {
    const first = await newCollection(a, "One");
    const second = await newCollection(a, "Two");
    const inFirst = await newGroup(a, first, "Mine");
    const inSecond = await newGroup(a, second, "Mine");
    const linkId = await saveLink(a, "https://example.com/one", first);
    await send(a, "PUT", `/collections/${second}/links/${linkId}`);
    await move(a, first, linkId, inFirst.id);
    await move(a, second, linkId, inSecond.id);

    await send(a, "DELETE", `/collections/${first}/groups/${inFirst.id}`);

    expect((await groups(a, second))[0]?.linkCount).toBe(1);
  });

  it("is NOT_FOUND once gone", async () => {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Recipes");
    await send(a, "DELETE", `/collections/${collectionId}/groups/${group.id}`);

    const res = await send(a, "DELETE", `/collections/${collectionId}/groups/${group.id}`);

    expect(res.status).toBe(404);
  });

  it("goes with its collection", async () => {
    const collectionId = await newCollection(a);
    await newGroup(a, collectionId, "Recipes");

    const res = await send(a, "DELETE", `/collections/${collectionId}`);

    expect(res.status).toBe(200);
    expect(await db.select().from(collectionGroup)).toEqual([]);
  });
});

describe("reordering groups", () => {
  it("rewrites the positions to the order sent", async () => {
    const collectionId = await newCollection(a);
    const one = await newGroup(a, collectionId, "One");
    const two = await newGroup(a, collectionId, "Two");
    const three = await newGroup(a, collectionId, "Three");

    const res = await send(a, "PUT", `/collections/${collectionId}/groups/order`, { ids: [three.id, one.id, two.id] });

    const items = (await data(res, listGroupsResponseSchema)).items;
    expect(items.map((group) => [group.name, group.position])).toEqual([
      ["Three", 0],
      ["One", 1],
      ["Two", 2],
    ]);
    expect((await groups(a, collectionId)).map((group) => group.name)).toEqual(["Three", "One", "Two"]);
  });

  it.each([
    ["a missing group", (ids: string[]) => ids.slice(1)],
    ["an unknown group", (ids: string[]) => [...ids, randomUUID()]],
    ["a repeated group", (ids: string[]) => [...ids, ids[0] ?? ""]],
  ])("rejects an order with %s as VALIDATION", async (_label, change) => {
    const collectionId = await newCollection(a);
    const one = await newGroup(a, collectionId, "One");
    const two = await newGroup(a, collectionId, "Two");

    const res = await send(a, "PUT", `/collections/${collectionId}/groups/order`, { ids: change([one.id, two.id]) });

    expect(res.status).toBe(400);
    expect((await failure(res)).code).toBe("VALIDATION");
    expect((await groups(a, collectionId)).map((group) => group.name)).toEqual(["One", "Two"]);
  });

  it("rejects another collection's group in the order", async () => {
    const first = await newCollection(a, "One");
    const second = await newCollection(a, "Two");
    await newGroup(a, first, "Mine");
    const other = await newGroup(a, second, "Other");

    const res = await send(a, "PUT", `/collections/${first}/groups/order`, { ids: [other.id] });

    expect(res.status).toBe(400);
  });

  it("accepts an empty order for a collection with no groups", async () => {
    const collectionId = await newCollection(a);

    const res = await send(a, "PUT", `/collections/${collectionId}/groups/order`, { ids: [] });

    expect(res.status).toBe(200);
  });
});

describe("moving a link", () => {
  it("puts it in the group, then back to ungrouped", async () => {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Recipes");
    const linkId = await saveLink(a, "https://example.com/one", collectionId);

    const into = await move(a, collectionId, linkId, group.id);
    const grouped = await listLinks(a, `collectionId=${collectionId}`);
    const out = await move(a, collectionId, linkId, null);
    const ungrouped = await listLinks(a, `collectionId=${collectionId}`);

    expect(into.status).toBe(200);
    expect(grouped.items[0]?.groupId).toBe(group.id);
    expect(out.status).toBe(200);
    expect(ungrouped.items[0]?.groupId).toBeNull();
  });

  it("keeps the group when the link is filed again", async () => {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Recipes");
    const linkId = await saveLink(a, "https://example.com/one", collectionId);
    await move(a, collectionId, linkId, group.id);

    await send(a, "PUT", `/collections/${collectionId}/links/${linkId}`);

    expect((await listLinks(a, `collectionId=${collectionId}`)).items[0]?.groupId).toBe(group.id);
  });

  it("files a link ungrouped when it joins a collection with groups", async () => {
    const collectionId = await newCollection(a);
    await newGroup(a, collectionId, "Recipes");

    const linkId = await saveLink(a, "https://example.com/one", collectionId);

    expect((await listLinks(a, `collectionId=${collectionId}`)).items.find((item) => item.id === linkId)?.groupId).toBeNull();
  });

  it("keeps a link's group per collection", async () => {
    const first = await newCollection(a, "One");
    const second = await newCollection(a, "Two");
    const inFirst = await newGroup(a, first, "First group");
    const linkId = await saveLink(a, "https://example.com/one", first);
    await send(a, "PUT", `/collections/${second}/links/${linkId}`);
    await move(a, first, linkId, inFirst.id);

    const inOne = await listLinks(a, `collectionId=${first}`);
    const inTwo = await listLinks(a, `collectionId=${second}`);

    expect(inOne.items[0]?.groupId).toBe(inFirst.id);
    expect(inTwo.items[0]?.groupId).toBeNull();
  });

  it("is NOT_FOUND for a group of another collection", async () => {
    const first = await newCollection(a, "One");
    const second = await newCollection(a, "Two");
    const elsewhere = await newGroup(a, second, "Elsewhere");
    const linkId = await saveLink(a, "https://example.com/one", first);

    const res = await move(a, first, linkId, elsewhere.id);

    expect(res.status).toBe(404);
    expect((await listLinks(a, `collectionId=${first}`)).items[0]?.groupId).toBeNull();
  });

  it("is NOT_FOUND for a link that is not in the collection", async () => {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Recipes");
    const linkId = await saveLink(a, "https://example.com/inbox");

    const res = await move(a, collectionId, linkId, group.id);

    expect(res.status).toBe(404);
    expect(await db.select().from(collectionItem)).toEqual([]);
  });

  it.each([
    ["no groupId", {}],
    ["a non-uuid groupId", { groupId: "recipes" }],
    ["an unknown field", { groupId: null, pinned: true }],
  ])("rejects a body with %s", async (_label, body) => {
    const collectionId = await newCollection(a);
    const linkId = await saveLink(a, "https://example.com/one", collectionId);

    const res = await send(a, "PATCH", `/collections/${collectionId}/links/${linkId}`, body);

    expect((await failure(res)).code).toBe("VALIDATION");
  });
});

describe("filtering links by group", () => {
  async function seedThree() {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Recipes");
    const grouped = await saveLink(a, "https://example.com/grouped", collectionId);
    const alsoGrouped = await saveLink(a, "https://example.com/also", collectionId);
    const loose = await saveLink(a, "https://example.com/loose", collectionId);
    await move(a, collectionId, grouped, group.id);
    await move(a, collectionId, alsoGrouped, group.id);
    return { collectionId, group, grouped, alsoGrouped, loose };
  }

  it("lists only the group's links", async () => {
    const { collectionId, group, grouped, alsoGrouped } = await seedThree();

    const page = await listLinks(a, `collectionId=${collectionId}&groupId=${group.id}`);

    expect(page.items.map((item) => item.id).sort()).toEqual([grouped, alsoGrouped].sort());
  });

  it("lists only the ungrouped links for none", async () => {
    const { collectionId, loose } = await seedThree();

    const page = await listLinks(a, `collectionId=${collectionId}&groupId=none`);

    expect(page.items.map((item) => item.id)).toEqual([loose]);
  });

  it("pages within the group", async () => {
    const { collectionId, group } = await seedThree();
    const query = `collectionId=${collectionId}&groupId=${group.id}&limit=1`;

    const first = await listLinks(a, query);
    const second = await listLinks(a, `${query}&cursor=${first.cursor ?? ""}`);

    expect(first.items).toHaveLength(1);
    expect(first.cursor).not.toBeNull();
    expect(second.items).toHaveLength(1);
    expect(second.cursor).toBeNull();
    expect(second.items[0]?.id).not.toBe(first.items[0]?.id);
  });

  it("returns nothing for a group of another collection", async () => {
    const { collectionId } = await seedThree();
    const other = await newGroup(a, await newCollection(a, "Other"), "Elsewhere");

    const page = await listLinks(a, `collectionId=${collectionId}&groupId=${other.id}`);

    expect(page.items).toEqual([]);
  });

  it("omits groupId from links outside a collection-scoped list", async () => {
    await seedThree();

    const page = await listLinks(a, "");

    for (const item of page.items) expect(item).not.toHaveProperty("groupId");
  });

  it.each([["groupId=none"], ["groupId=not-a-uuid&collectionId=" + randomUUID()]])(
    "rejects %s without a collection or with a bad id",
    async (query) => {
      const res = await send(a, "GET", `/links?${query}`);

      expect(res.status).toBe(400);
    },
  );
});

describe("another user's collection and groups", () => {
  async function theirs() {
    const collectionId = await newCollection(a);
    const group = await newGroup(a, collectionId, "Private");
    const linkId = await saveLink(a, "https://example.com/private", collectionId);
    await move(a, collectionId, linkId, group.id);
    return { collectionId, group, linkId };
  }

  it("is NOT_FOUND on every route and changes nothing", async () => {
    const { collectionId, group, linkId } = await theirs();
    const mine = await newCollection(b);
    const base = `/collections/${collectionId}`;

    const responses = await Promise.all([
      send(b, "GET", `${base}/groups`),
      send(b, "POST", `${base}/groups`, { name: "Mine" }),
      send(b, "PATCH", `${base}/groups/${group.id}`, { name: "Stolen" }),
      send(b, "DELETE", `${base}/groups/${group.id}`),
      send(b, "PUT", `${base}/groups/order`, { ids: [group.id] }),
      move(b, collectionId, linkId, null),
      send(b, "PATCH", `/collections/${mine}/groups/${group.id}`, { name: "Stolen" }),
      send(b, "DELETE", `/collections/${mine}/groups/${group.id}`),
      send(b, "GET", `/links?collectionId=${collectionId}&groupId=${group.id}`),
    ]);

    expect(responses.map((res) => res.status)).toEqual([404, 404, 404, 404, 404, 404, 404, 404, 404]);
    expect(await groups(a, collectionId)).toEqual([{ ...group, linkCount: 1 }]);
  });

  it("cannot move its own link into their group", async () => {
    const { group } = await theirs();
    const mine = await newCollection(b);
    const linkId = await saveLink(b, "https://example.com/mine", mine);

    const res = await move(b, mine, linkId, group.id);

    expect(res.status).toBe(404);
  });
});
