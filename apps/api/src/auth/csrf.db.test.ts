import { randomUUID } from "node:crypto";
import { sessionSchema } from "@linkables/shared/auth";
import { successEnvelopeSchema } from "@linkables/shared/http";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, expect, test } from "vitest";
import { createTestApp } from "../../test/app";
import { PASSWORD, TEST_AUTH } from "../../test/auth/local";
import { connectTestDb, truncateAll } from "../../test/db";
import { collection } from "../db/schema";
import { createLocalAuth } from "./local-auth";
import { provisionUser } from "./provision";
import { user } from "./schema";

const { db, close } = connectTestDb();
afterAll(close);
const localAuth = createLocalAuth(db.$client, TEST_AUTH);
const app = createTestApp({ db, localAuth, auth: TEST_AUTH });
let collectionId: string;
let cookie: string;
let token: string;

beforeEach(async () => {
  await truncateAll(db);
  await db.delete(user);
  const id = randomUUID();
  const owner = await provisionUser(db.$client, TEST_AUTH, { id, email: `${id}@example.test`, name: "Owner", password: PASSWORD });
  const [folder] = await db.insert(collection).values({ userId: owner.id, name: "Private research" }).returning();
  if (!folder) throw new Error("Collection fixture missing");
  collectionId = folder.id;
  const response = await app.request("/api/v1/auth/sign-in", {
    method: "POST", headers: { Origin: TEST_AUTH.appOrigin, "Content-Type": "application/json" },
    body: JSON.stringify({ email: owner.email, password: PASSWORD }),
  });
  expect(response.status).toBe(200);
  cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  token = successEnvelopeSchema(sessionSchema).parse(await response.json()).data.token;
});

test("a foreign-origin form cannot publish a collection using a signed-in cookie", async () => {
  const response = await app.request(`/api/v1/collections/${collectionId}/share`, {
    method: "POST", headers: { Origin: "http://localhost:5488", Cookie: cookie, "Content-Type": "application/x-www-form-urlencoded" },
    body: "publish=true",
  });
  expect(response.status).toBe(403);
  const [folder] = await db.select().from(collection).where(eq(collection.id, collectionId));
  expect(folder?.shareToken).toBeNull();
});

test("a foreign-origin cookie request cannot delete a collection", async () => {
  const response = await app.request(`/api/v1/collections/${collectionId}`, {
    method: "DELETE", headers: { Origin: "http://localhost:5488", Cookie: cookie },
  });
  expect(response.status).toBe(403);
  expect(await db.select().from(collection).where(eq(collection.id, collectionId))).toHaveLength(1);
});

test("a foreign-origin cookie request cannot create library data", async () => {
  const response = await app.request("/api/v1/collections", {
    method: "POST", headers: { Origin: "http://localhost:5488", Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Unwanted collection" }),
  });
  expect(response.status).toBe(403);
  expect(await db.select().from(collection)).toHaveLength(1);
});

test("a trusted same-origin cookie request can publish its own collection", async () => {
  const response = await app.request(`/api/v1/collections/${collectionId}/share`, {
    method: "POST", headers: { Origin: TEST_AUTH.appOrigin, Cookie: cookie },
  });
  expect(response.status).toBe(200);
  const [folder] = await db.select().from(collection).where(eq(collection.id, collectionId));
  expect(folder?.shareToken).toEqual(expect.any(String));
});

test("a configured browser extension can still write with its bearer session", async () => {
  const response = await app.request(`/api/v1/collections/${collectionId}/share`, {
    method: "POST", headers: { Origin: "chrome-extension://ekgbmopoceccloaibfknnbnohkpbkili", Authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(200);
});

test("an operator request without an Origin header can still use a bearer session", async () => {
  const response = await app.request(`/api/v1/collections/${collectionId}/share`, {
    method: "POST", headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(200);
});
