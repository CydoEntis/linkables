import { failureEnvelopeSchema } from "@linkables/shared/http";
import { describe, expect, it } from "vitest";
import { createTestApp, testUsers } from "../../test/app";

const { a } = await testUsers();

// No database is reachable here, so each request must be rejected before any query.
function post(body: string | null, headers: Record<string, string> = a.headers) {
  return createTestApp().request("/api/v1/links", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
}

async function expectValidationError(res: Response) {
  expect(res.status).toBe(400);
  expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("VALIDATION");
}

describe("POST /links validation", () => {
  it("rejects a url longer than 2048 characters", async () => {
    const url = `https://example.com/${"a".repeat(2049 - "https://example.com/".length)}`;

    await expectValidationError(await post(JSON.stringify({ url })));
  });

  it("rejects a 2000-character url whose canonical form exceeds 2048 bytes", async () => {
    const url = `https://example.com/${"é".repeat(2000 - "https://example.com/".length)}`;

    await expectValidationError(await post(JSON.stringify({ url })));
  });

  it("rejects a javascript: url", async () => {
    await expectValidationError(await post(JSON.stringify({ url: "javascript:alert(1)" })));
  });

  it("rejects text that is not a url", async () => {
    await expectValidationError(await post(JSON.stringify({ url: "not a url" })));
  });

  it("rejects a body without a url field", async () => {
    await expectValidationError(await post(JSON.stringify({})));
  });

  it("rejects a request without a body", async () => {
    await expectValidationError(await post(null));
  });

  it("rejects malformed json", async () => {
    await expectValidationError(await post("{"));
  });

  it("rejects a body larger than 16 KB", async () => {
    const res = await post(JSON.stringify({ url: "https://example.com", padding: "x".repeat(17 * 1024) }));

    expect(res.status).toBe(400);
    expect(failureEnvelopeSchema.parse(await res.json()).error).toMatchObject({
      code: "VALIDATION",
      message: "Invalid request",
    });
  });

  it("rejects a collectionId that is not a uuid", async () => {
    await expectValidationError(await post(JSON.stringify({ url: "https://example.com", collectionId: "reading" })));
  });

  it("rejects a url that is only whitespace", async () => {
    await expectValidationError(await post(JSON.stringify({ url: "   " })));
  });

  it("rejects a request without a token", async () => {
    const res = await post(JSON.stringify({ url: "https://example.com" }), {});

    expect(res.status).toBe(401);
  });
});

function list(query: string, headers: Record<string, string> = a.headers) {
  return createTestApp().request(`/api/v1/links?${query}`, { headers });
}

const LINK_ID = "3f2b8c1e-9d4a-4b6e-8f1a-2c3d4e5f6a7b";

function token(cursor: object): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

describe("GET /links validation", () => {
  it("rejects a malformed cursor", async () => {
    await expectValidationError(await list("cursor=not-a-cursor"));
  });

  it("rejects a cursor that decodes to the wrong shape", async () => {
    const cursor = Buffer.from(JSON.stringify({ savedAt: "yesterday", id: "x" })).toString("base64url");

    await expectValidationError(await list(`cursor=${cursor}`));
  });

  it("rejects a cursor dated in year 0, which Postgres cannot store", async () => {
    const cursor = token({ sort: "newest", savedAt: "0000-01-01T00:00:00.000000Z", id: LINK_ID });

    await expectValidationError(await list(`cursor=${cursor}`));
  });

  it.each(["0", "101", "ten", "2.5"])("rejects limit=%s", async (limit) => {
    await expectValidationError(await list(`limit=${limit}`));
  });

  it("rejects an unknown view", async () => {
    await expectValidationError(await list("view=archive"));
  });

  it("rejects view=inbox with a collectionId", async () => {
    await expectValidationError(await list("view=inbox&collectionId=3f2b8c1e-9d4a-4b6e-8f1a-2c3d4e5f6a7b"));
  });

  it("rejects a search query longer than 200 characters", async () => {
    await expectValidationError(await list(`q=${"a".repeat(201)}`));
  });

  it.each(["%00", "a%00b", "a%0Ab", "%1B"])("rejects a search query with control character q=%s", async (q) => {
    await expectValidationError(await list(`q=${q}`));
  });

  it.each([
    ["oldest", "newest"],
    ["newest", "oldest"],
    ["title", "newest"],
    ["newest", "title"],
  ])("rejects a %s cursor used with sort=%s", async (cursorSort, sort) => {
    const key = cursorSort === "title" ? { k: "AAAAAAAAAAAAAAAA" } : { savedAt: "2026-01-01T00:00:00.000000Z" };
    const cursor = token({ sort: cursorSort, ...key, id: LINK_ID });

    await expectValidationError(await list(`sort=${sort}&cursor=${cursor}`));
  });

  it("rejects a cursor without a sort", async () => {
    const cursor = token({ savedAt: "2026-01-01T00:00:00.000000Z", id: LINK_ID });

    await expectValidationError(await list(`cursor=${cursor}`));
  });

  it("rejects a title cursor carrying a sort key", async () => {
    const cursor = token({ sort: "title", title: "https://example.com/?token=secret", id: LINK_ID });

    await expectValidationError(await list(`sort=title&cursor=${cursor}`));
  });

  it.each([undefined, "", "short", "AAAAAAAAAAAAAAA!"])("rejects a title cursor with key fingerprint %s", async (k) => {
    const cursor = token({ sort: "title", id: LINK_ID, ...(k === undefined ? {} : { k }) });

    await expectValidationError(await list(`sort=title&cursor=${cursor}`));
  });

  it.each(["kind=book", "kind=Video", "pinned=yes", "pinned=1", "pinned=", "sort=relevance", "sort=Title"])(
    "rejects %s",
    async (query) => {
      await expectValidationError(await list(query));
    },
  );

  it.each([
    "from=yesterday",
    "from=2026-13-01",
    "to=2026-02-30",
    "from=2026-3-1",
    "from=0000-01-01",
    "to=0000-01-01T00:00:00Z",
    "from=2026-03-01T12:00:00",
    "to=1772366400",
    "to=2026-03-01T12:00:00.1234567Z",
  ])("rejects the date bound %s", async (query) => {
    await expectValidationError(await list(query));
  });

  it.each([
    "from=2026-03-02&to=2026-03-01",
    "from=2026-03-01T12:00:00Z&to=2026-03-01T11:59:59Z",
    "from=2026-03-02T00:00:00Z&to=2026-03-01",
    "from=2026-03-01&to=2026-02-28T23:59:59Z",
  ])("rejects a range that ends before it starts: %s", async (query) => {
    await expectValidationError(await list(query));
  });

  it("rejects a request without a token", async () => {
    const res = await list("", {});

    expect(res.status).toBe(401);
  });
});
