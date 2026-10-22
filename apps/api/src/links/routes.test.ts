import { failureEnvelopeSchema } from "@linkaroo/shared/http";
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

describe("GET /links validation", () => {
  it("rejects a malformed cursor", async () => {
    await expectValidationError(await list("cursor=not-a-cursor"));
  });

  it("rejects a cursor that decodes to the wrong shape", async () => {
    const cursor = Buffer.from(JSON.stringify({ savedAt: "yesterday", id: "x" })).toString("base64url");

    await expectValidationError(await list(`cursor=${cursor}`));
  });

  it("rejects a cursor dated in year 0, which Postgres cannot store", async () => {
    const cursor = Buffer.from(
      JSON.stringify({ savedAt: "0000-01-01T00:00:00.000000Z", id: "3f2b8c1e-9d4a-4b6e-8f1a-2c3d4e5f6a7b" }),
    ).toString("base64url");

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

  it("rejects a request without a token", async () => {
    const res = await list("", {});

    expect(res.status).toBe(401);
  });
});
