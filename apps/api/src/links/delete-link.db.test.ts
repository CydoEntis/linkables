import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkaroo/shared/http";
import { listLinksResponseSchema, saveLinkResponseSchema } from "@linkaroo/shared/links";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection, collectionItem, resource, savedLink } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const app = createTestApp({ db });

async function save(user: TestUser, url = "https://example.com/post") {
  const res = await app.request("/api/v1/links", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...user.headers },
    body: JSON.stringify({ url }),
  });
  return successEnvelopeSchema(saveLinkResponseSchema).parse(await res.json()).data;
}

function remove(user: TestUser, id: string) {
  return app.request(`/api/v1/links/${id}`, { method: "DELETE", headers: user.headers });
}

async function listIds(user: TestUser) {
  const res = await app.request("/api/v1/links", { headers: user.headers });
  return successEnvelopeSchema(listLinksResponseSchema)
    .parse(await res.json())
    .data.items.map((item) => item.id);
}

async function expectNotFound(res: Response) {
  expect(res.status).toBe(404);
  expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("NOT_FOUND");
}

describe("DELETE /links/:id", () => {
  it("returns 200 with null data", async () => {
    const link = await save(a);

    const res = await remove(a, link.id);

    expect(res.status).toBe(200);
    expect(successEnvelopeSchema(z.null()).parse(await res.json()).data).toBeNull();
  });

  it("removes the link from the list but keeps the resource and other users' links", async () => {
    const linkA = await save(a);
    const linkB = await save(b);
    const [rowB] = await db.select().from(savedLink).where(eq(savedLink.id, linkB.id));

    await remove(a, linkA.id);

    expect(await listIds(a)).toEqual([]);
    expect(await db.select({ id: resource.id }).from(resource)).toEqual([{ id: linkA.resource.id }]);
    expect(await db.select().from(savedLink)).toEqual([rowB]);
    expect(await listIds(b)).toEqual([linkB.id]);
  });

  it("removes the link from its collections", async () => {
    const link = await save(a);
    const [col] = await db.insert(collection).values({ userId: a.id, name: "Reading" }).returning();
    if (!col) throw new Error("insert returned no row");
    await db.insert(collectionItem).values({ collectionId: col.id, savedLinkId: link.id });

    await remove(a, link.id);

    expect(await db.$count(collectionItem)).toBe(0);
    expect(await db.$count(collection)).toBe(1);
  });

  it("returns 404 for an unknown link", async () => {
    await expectNotFound(await remove(a, "3f2b8c1e-9d4a-4b6e-8f1a-2c3d4e5f6a7b"));
  });

  it("returns 404 for a link already deleted", async () => {
    const link = await save(a);
    await remove(a, link.id);

    await expectNotFound(await remove(a, link.id));
  });

  it("returns 404 to another user and keeps the link", async () => {
    const link = await save(a);

    await expectNotFound(await remove(b, link.id));

    expect(await listIds(a)).toEqual([link.id]);
  });
});
