import { successEnvelopeSchema } from "@linkables/shared/http";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createTestApp } from "../test/app";

describe("GET /health", () => {
  it("returns 200 with a success envelope", async () => {
    const res = await createTestApp().request("/health");

    expect(res.status).toBe(200);
    const body = successEnvelopeSchema(z.object({ status: z.literal("ok") })).parse(await res.json());
    expect(body.ok).toBe(true);
  });
});
