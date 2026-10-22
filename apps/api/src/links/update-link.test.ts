import { failureEnvelopeSchema } from "@linkaroo/shared/http";
import { describe, expect, it } from "vitest";
import { createTestApp, testUsers } from "../../test/app";

const { a } = await testUsers();

const LINK_ID = "3f2b8c1e-9d4a-4b6e-8f1a-2c3d4e5f6a7b";

// No database is reachable here, so each request must be rejected before any query.
function patch(body: unknown, { id = LINK_ID, headers = a.headers }: { id?: string; headers?: object } = {}) {
  return createTestApp().request(`/api/v1/links/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function expectValidationError(res: Response) {
  expect(res.status).toBe(400);
  expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("VALIDATION");
}

describe("PATCH /links/:id validation", () => {
  it("rejects an empty body", async () => {
    await expectValidationError(await patch({}));
  });

  it("rejects an unknown field", async () => {
    await expectValidationError(await patch({ pinned: true, resourceId: LINK_ID }));
  });

  it("rejects a title longer than 300 characters", async () => {
    await expectValidationError(await patch({ titleOverride: "t".repeat(301) }));
  });

  it("rejects a note longer than 5000 characters", async () => {
    await expectValidationError(await patch({ note: "n".repeat(5001) }));
  });

  it("rejects a note containing a control character", async () => {
    await expectValidationError(await patch({ note: "before\u0000after" }));
  });

  it.each([
    ["titleOverride", "U+202E", "\u202E"],
    ["titleOverride", "U+2066", "\u2066"],
    ["note", "U+202A", "\u202A"],
    ["note", "U+2069", "\u2069"],
  ])("rejects a %s containing the bidi control %s", async (field, _name, char) => {
    await expectValidationError(await patch({ [field]: `before${char}after` }));
  });

  it.each(["titleOverride", "note"])("rejects a %s containing a lone surrogate", async (field) => {
    await expectValidationError(await patch({ [field]: "before\uD800after" }));
  });

  it("rejects a pinned value that is not a boolean", async () => {
    await expectValidationError(await patch({ pinned: "yes" }));
  });

  it("rejects an id that is not a uuid", async () => {
    await expectValidationError(await patch({ pinned: true }, { id: "not-a-uuid" }));
  });

  it("rejects a request without a token", async () => {
    const res = await patch({ pinned: true }, { headers: {} });

    expect(res.status).toBe(401);
  });
});
