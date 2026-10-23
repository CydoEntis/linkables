import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { savedLinkSchema, saveLinkResponseSchema, type UpdateLinkRequest } from "@linkables/shared/links";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import { resource } from "../db/schema";

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

function patch(user: TestUser, id: string, body: UpdateLinkRequest) {
  return app.request(`/api/v1/links/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...user.headers },
    body: JSON.stringify(body),
  });
}

async function updated(res: Response) {
  expect(res.status).toBe(200);
  return successEnvelopeSchema(savedLinkSchema).parse(await res.json()).data;
}

async function expectNotFound(res: Response) {
  expect(res.status).toBe(404);
  expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("NOT_FOUND");
}

describe("PATCH /links/:id", () => {
  it("sets a title override", async () => {
    const link = await save(a);

    expect(await updated(await patch(a, link.id, { titleOverride: "My title" }))).toMatchObject({
      id: link.id,
      titleOverride: "My title",
    });
  });

  it("sets a note, keeping its line breaks", async () => {
    const link = await save(a);

    expect((await updated(await patch(a, link.id, { note: "line one\nline two" }))).note).toBe("line one\nline two");
  });

  it("pins and unpins a link", async () => {
    const link = await save(a);

    expect((await updated(await patch(a, link.id, { pinned: true }))).pinned).toBe(true);
    expect((await updated(await patch(a, link.id, { pinned: false }))).pinned).toBe(false);
  });

  it("clears the title override and note with null", async () => {
    const link = await save(a);
    await patch(a, link.id, { titleOverride: "My title", note: "A note" });

    expect(await updated(await patch(a, link.id, { titleOverride: null, note: null }))).toMatchObject({
      titleOverride: null,
      note: null,
    });
  });

  it("clears the title override with a blank string", async () => {
    const link = await save(a);
    await patch(a, link.id, { titleOverride: "My title" });

    expect((await updated(await patch(a, link.id, { titleOverride: "   " }))).titleOverride).toBeNull();
  });

  // Caps count code points, so four-byte characters make the largest body a valid edit can send.
  it("accepts a full-length title and note in four-byte characters", async () => {
    const link = await save(a);
    const titleOverride = "\u{1F516}".repeat(300);
    const note = "\u{1F4DD}".repeat(3500);

    expect(await updated(await patch(a, link.id, { titleOverride, note }))).toMatchObject({ titleOverride, note });
  });

  it("collapses line breaks and tabs in a title to single spaces", async () => {
    const link = await save(a);

    const result = await updated(await patch(a, link.id, { titleOverride: "one\r\ntwo\tthree\u2028four\u2029  five" }));

    expect(result.titleOverride).toBe("one two three four five");
  });

  it("keeps tabs and line breaks in a note", async () => {
    const link = await save(a);
    const note = "one\r\ntwo\tthree\u2028four";

    expect((await updated(await patch(a, link.id, { note }))).note).toBe(note);
  });

  it("trims surrounding whitespace", async () => {
    const link = await save(a);

    expect((await updated(await patch(a, link.id, { titleOverride: "  My title \n" }))).titleOverride).toBe("My title");
  });

  it("leaves fields that were not sent unchanged", async () => {
    const link = await save(a);
    await patch(a, link.id, { titleOverride: "My title", note: "A note" });

    expect(await updated(await patch(a, link.id, { pinned: true }))).toMatchObject({
      titleOverride: "My title",
      note: "A note",
      pinned: true,
    });
  });

  it("never changes the shared resource", async () => {
    const link = await save(a);
    await db.update(resource).set({ title: "Fetched title" }).where(eq(resource.id, link.resource.id));
    const [before] = await db.select().from(resource);

    const result = await updated(await patch(a, link.id, { titleOverride: "My title", note: "A note", pinned: true }));

    expect(result.resource.title).toBe("Fetched title");
    expect(await db.select().from(resource)).toEqual([before]);
  });

  it("returns 404 for an unknown link", async () => {
    await expectNotFound(await patch(a, "3f2b8c1e-9d4a-4b6e-8f1a-2c3d4e5f6a7b", { pinned: true }));
  });

  it("returns 404 to another user and leaves the link unchanged", async () => {
    const link = await save(a);

    await expectNotFound(await patch(b, link.id, { titleOverride: "Hijacked", pinned: true }));

    expect(await save(a)).toMatchObject({ titleOverride: null, pinned: false });
  });
});
