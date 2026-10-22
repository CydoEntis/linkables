import { failureEnvelopeSchema } from "@linkaroo/shared/http";
import { describe, expect, it } from "vitest";
import { createTestApp, testUsers } from "../../test/app";

const { a } = await testUsers();

describe("DELETE /links/:id validation", () => {
  it("rejects an id that is not a uuid", async () => {
    const res = await createTestApp().request("/api/v1/links/not-a-uuid", { method: "DELETE", headers: a.headers });

    expect(res.status).toBe(400);
    expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("VALIDATION");
  });
});
