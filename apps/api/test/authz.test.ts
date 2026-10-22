import { failureEnvelopeSchema } from "@linkaroo/shared/http";
import { inspectRoutes } from "hono/dev";
import { describe, expect, it } from "vitest";
import { createTestApp } from "./app";

// Every route except /health. Each new route adds a row here and a two-user
// test beside its source.
const PROTECTED_ROUTES = [
  ["GET", "/api/v1/me"],
  ["POST", "/api/v1/links"],
  ["GET", "/api/v1/links"],
  ["GET", "/api/v1/collections"],
  ["POST", "/api/v1/collections"],
  ["PATCH", "/api/v1/collections/:id"],
  ["DELETE", "/api/v1/collections/:id"],
  ["PUT", "/api/v1/collections/:id/links/:linkId"],
  ["DELETE", "/api/v1/collections/:id/links/:linkId"],
  ["PATCH", "/api/v1/links/:id"],
  ["DELETE", "/api/v1/links/:id"],
] as const;

const PUBLIC_ROUTES = [["GET", "/health"]] as const;

function unlistedRoutes(app: ReturnType<typeof createTestApp>): string[] {
  const listed = new Set([...PROTECTED_ROUTES, ...PUBLIC_ROUTES].map(([method, path]) => `${method} ${path}`));
  return inspectRoutes(app)
    .filter((route) => !route.isMiddleware)
    .map(({ method, path }) => `${method} ${path}`)
    .filter((route) => !listed.has(route));
}

describe("authz", () => {
  it.each(PROTECTED_ROUTES)("%s %s rejects a request without a token", async (method, path) => {
    const res = await createTestApp().request(path, { method });

    expect(res.status).toBe(401);
    expect(failureEnvelopeSchema.parse(await res.json()).error.code).toBe("UNAUTHENTICATED");
  });

  it("lists every registered route", () => {
    expect(unlistedRoutes(createTestApp())).toEqual([]);
  });

  it("flags a registered route that is not listed", () => {
    const app = createTestApp();
    app.post("/api/v1/unlisted", (c) => c.body(null));

    expect(unlistedRoutes(app)).toEqual(["POST /api/v1/unlisted"]);
  });
});
