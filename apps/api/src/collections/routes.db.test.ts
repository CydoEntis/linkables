import { listCollectionsResponseSchema, collectionSchema } from "@linkables/shared/collections";
import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
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

async function data<T extends z.ZodType>(res: Response, schema: T): Promise<z.output<T>> {
  return schema.parse(successEnvelopeSchema(z.unknown()).parse(await res.json()).data);
}

async function errorCode(res: Response) {
  return failureEnvelopeSchema.parse(await res.json()).error.code;
}

async function create(user: TestUser, name: string) {
  const res = await send(user, "POST", "/collections", { name });
  expect(res.status).toBe(201);
  return data(res, collectionSchema);
}

async function names(user: TestUser) {
  const res = await send(user, "GET", "/collections");
  expect(res.status).toBe(200);
  return (await data(res, listCollectionsResponseSchema)).items.map((item) => item.name);
}

describe("collections", () => {
  it("creates a collection with a trimmed name", async () => {
    const col = await create(a, "  Reading  ");

    expect(col.name).toBe("Reading");
    expect(await names(a)).toEqual(["Reading"]);
  });

  it("lists the caller's collections by name, ignoring case", async () => {
    await create(a, "recipes");
    await create(a, "Articles");
    await create(a, "Music");

    expect(await names(a)).toEqual(["Articles", "Music", "recipes"]);
  });

  it("rejects a duplicate name for the same user with CONFLICT", async () => {
    await create(a, "Reading");

    const res = await send(a, "POST", "/collections", { name: " Reading " });

    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("CONFLICT");
  });

  it("lets two users use the same name", async () => {
    await create(a, "Reading");

    await create(b, "Reading");

    expect(await names(b)).toEqual(["Reading"]);
  });

  it("renames a collection", async () => {
    const col = await create(a, "Reading");

    const res = await send(a, "PATCH", `/collections/${col.id}`, { name: "Later" });

    expect(res.status).toBe(200);
    expect(await data(res, collectionSchema)).toEqual({ ...col, name: "Later" });
    expect(await names(a)).toEqual(["Later"]);
  });

  it("rejects a rename to another collection's name with CONFLICT", async () => {
    await create(a, "Reading");
    const col = await create(a, "Later");

    const res = await send(a, "PATCH", `/collections/${col.id}`, { name: "Reading" });

    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("CONFLICT");
  });

  it("deletes a collection", async () => {
    const col = await create(a, "Reading");

    const res = await send(a, "DELETE", `/collections/${col.id}`);

    expect(res.status).toBe(200);
    expect(await data(res, z.null())).toBeNull();
    expect(await names(a)).toEqual([]);
  });

  it("shows a user none of another user's collections", async () => {
    await create(a, "Reading");

    expect(await names(b)).toEqual([]);
  });

  it.each([
    ["PATCH", { name: "Mine now" }],
    ["DELETE", undefined],
  ])("returns NOT_FOUND to another user who sends %s", async (method, body) => {
    const col = await create(a, "Reading");

    const res = await send(b, method, `/collections/${col.id}`, body);

    expect(res.status).toBe(404);
    expect(await errorCode(res)).toBe("NOT_FOUND");
    expect(await names(a)).toEqual(["Reading"]);
  });
});
