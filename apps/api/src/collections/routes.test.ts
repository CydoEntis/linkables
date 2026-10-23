import { failureEnvelopeSchema } from "@linkables/shared/http";
import { describe, expect, it } from "vitest";
import { createTestApp, testUsers } from "../../test/app";

const { a } = await testUsers();

const SOME_ID = "3f2b8c1e-9d4a-4b6e-8f1a-2c3d4e5f6a7b";

// No database is reachable here, so each request must be rejected before any query.
function send(method: string, path: string, body?: unknown) {
  return createTestApp().request(`/api/v1${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...a.headers },
    body: body === undefined ? null : JSON.stringify(body),
  });
}

async function expectValidationError(res: Response) {
  expect(res.status).toBe(400);
  expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("VALIDATION");
}

describe("collection request validation", () => {
  it.each(["", "   "])("rejects the name %j", async (name) => {
    await expectValidationError(await send("POST", "/collections", { name }));
  });

  it("rejects a name longer than 100 characters", async () => {
    await expectValidationError(await send("POST", "/collections", { name: "a".repeat(101) }));
  });

  it("rejects a body without a name", async () => {
    await expectValidationError(await send("POST", "/collections", {}));
  });

  it("rejects an empty name on rename", async () => {
    await expectValidationError(await send("PATCH", `/collections/${SOME_ID}`, { name: " " }));
  });

  it.each([
    ["PATCH", "/collections/not-a-uuid"],
    ["DELETE", "/collections/not-a-uuid"],
    ["PUT", `/collections/not-a-uuid/links/${SOME_ID}`],
    ["PUT", `/collections/${SOME_ID}/links/not-a-uuid`],
    ["DELETE", `/collections/${SOME_ID}/links/not-a-uuid`],
  ])("%s %s rejects an id that is not a uuid", async (method, path) => {
    await expectValidationError(await send(method, path, { name: "Reading" }));
  });
});
