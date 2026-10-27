import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { PASSWORD, TEST_AUTH } from "../../test/auth/local";
import { createLocalAuth } from "../auth/local-auth";
import { provisionUser } from "../auth/provision";
import { user } from "../auth/schema";
import { collection, collectionItem, resource, savedLink } from "../db/schema";

const { db, close } = connectTestDb();
afterAll(close);
let a: { id: string; headers: { Authorization: string } };
let b: { id: string; headers: { Authorization: string } };
const localAuth = createLocalAuth(db.$client, TEST_AUTH);

beforeEach(async () => {
  await truncateAll(db);
  await db.delete(user);
  const account = async (email: string) => {
    const person = await provisionUser(db.$client, TEST_AUTH, { id: randomUUID(), email, name: email, password: PASSWORD });
    const signedIn = await localAuth.api.signInEmail({ body: { email, password: PASSWORD } });
    return { id: person.id, headers: { Authorization: `Bearer ${signedIn.token}` } };
  };
  a = await account("a@example.com");
  b = await account("b@example.com");
});

function app() { return createTestApp({ db, localAuth, auth: TEST_AUTH, notifyAccountDeleted: undefined }); }

async function seed() {
  const [page] = await db.insert(resource).values({ canonicalUrl: "https://example.com/page" }).returning();
  if (!page) throw new Error("Resource fixture missing");
  for (const owner of [a,b]) {
    const [link] = await db.insert(savedLink).values({ userId: owner.id, resourceId: page.id, originalUrl: page.canonicalUrl }).returning();
    const [folder] = await db.insert(collection).values({ userId: owner.id, name: "Reading" }).returning();
    if (!link || !folder) throw new Error("Library fixture missing");
    await db.insert(collectionItem).values({ collectionId: folder.id, savedLinkId: link.id });
  }
}

describe("local account deletion", () => {
  it("deletes the caller's library and local identity without an email service", async () => {
    await seed();
    const response = await app().request("/api/v1/me", { method: "DELETE", headers: a.headers });
    expect(response.status).toBe(200);
    expect(await db.select().from(savedLink).where(eq(savedLink.userId, a.id))).toEqual([]);
    expect(await db.select().from(collection).where(eq(collection.userId, a.id))).toEqual([]);
    expect(await db.select().from(user).where(eq(user.id, a.id))).toEqual([]);
  });

  it("revokes the deleted account's sessions", async () => {
    const api = app();
    await api.request("/api/v1/me", { method: "DELETE", headers: a.headers });
    expect((await api.request("/api/v1/me", { headers: a.headers })).status).toBe(401);
  });

  it("leaves the other user's library and sessions intact", async () => {
    await seed();
    const api = app();
    const links = await db.select().from(savedLink).where(eq(savedLink.userId, b.id));
    await api.request("/api/v1/me", { method: "DELETE", headers: a.headers });
    expect(await db.select().from(savedLink).where(eq(savedLink.userId, b.id))).toEqual(links);
    expect((await api.request("/api/v1/me", { headers: b.headers })).status).toBe(200);
    expect(await db.select().from(resource)).toHaveLength(1);
  });

  it("deletes locally even when an optional email notification fails", async () => {
    const api = createTestApp({ db, localAuth, auth: TEST_AUTH, notifyAccountDeleted: () => Promise.reject(new Error("mail unavailable")) });
    expect((await api.request("/api/v1/me", { method: "DELETE", headers: a.headers })).status).toBe(200);
    expect(await db.select().from(user).where(eq(user.id, a.id))).toEqual([]);
  });
});
