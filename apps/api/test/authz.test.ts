import { failureEnvelopeSchema } from "@linkaroo/shared/http";
import { describe, expect, it } from "vitest";
import { createTestApp } from "./app";

// Every route except /health. Each new route adds a row here and a two-user
// test beside its source.
const PROTECTED_ROUTES = [["GET", "/api/v1/me"]] as const;

describe("authz", () => {
  it.each(PROTECTED_ROUTES)("%s %s rejects a request without a token", async (method, path) => {
    const res = await createTestApp().request(path, { method });

    expect(res.status).toBe(401);
    expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("UNAUTHENTICATED");
  });
});
