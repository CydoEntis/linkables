import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
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

async function save(user: TestUser, url = "https://example.com/post") {
  const res = await app.request("/api/v1/links", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...user.headers },
    body: JSON.stringify({ url, source: "iphone" }),
  });
  return successEnvelopeSchema(saveLinkResponseSchema).parse(await res.json()).data;
}

function get(user: TestUser, id: string) {
  return app.request(`/api/v1/links/${id}`, { headers: user.headers });
}

async function notFound(res: Response) {
  expect(res.status).toBe(404);
  const { error } = failureEnvelopeSchema.parse(await res.json());
  expect(error.code).toBe("NOT_FOUND");
  return error;
}

describe("GET /links/:id", () => {
  it("returns the caller's link as the list has it, with its collections", async () => {
    const link = await save(a);
    const [reading] = await db.insert(collection).values({ userId: a.id, name: "Reading" }).returning();
    if (reading === undefined) throw new Error("insert returned no row");
    await db.insert(collectionItem).values({ collectionId: reading.id, savedLinkId: link.id });
    const listed = await app.request("/api/v1/links", { headers: a.headers });
    const [item] = successEnvelopeSchema(listLinksResponseSchema).parse(await listed.json()).data.items;

    const res = await get(a, link.id);

    expect(res.status).toBe(200);
    const fetched = successEnvelopeSchema(savedLinkSchema).parse(await res.json()).data;
    expect(fetched).toEqual(item);
    expect(fetched).toMatchObject({ savedFrom: "iphone", collections: [{ id: reading.id, name: "Reading" }] });
  });

  it("answers another user's link exactly as an unknown one", async () => {
    const link = await save(a);

    const theirs = await notFound(await get(b, link.id));
    const unknown = await notFound(await get(b, "3f2b8c1e-9d4a-4b6e-8f1a-2c3d4e5f6a7b"));

    expect(theirs).toEqual(unknown);
  });

  it("rejects an id that is not a uuid", async () => {
    const res = await get(a, "not-a-uuid");

    expect(res.status).toBe(400);
    expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("VALIDATION");
  });
});
