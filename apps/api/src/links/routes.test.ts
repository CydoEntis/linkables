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

  it("rejects a request without a token", async () => {
    const res = await post(JSON.stringify({ url: "https://example.com" }), {});

    expect(res.status).toBe(401);
  });
});
