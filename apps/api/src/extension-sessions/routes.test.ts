import { extensionSessionSchema } from "@linkables/shared/extension-sessions";
import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { describe, expect, it, vi } from "vitest";
import { captureLogger, createTestApp, testUsers } from "../../test/app";
import type { SupabaseAdmin } from "./supabase-admin";

const { a, b } = await testUsers();
const NOW = Date.UTC(2026, 9, 26, 12);

type App = ReturnType<typeof createTestApp>;

function mint(app: App, headers: Record<string, string> = {}) {
  return app.request("/api/v1/extension-sessions", { method: "POST", headers });
}

async function errorCode(res: Response) {
  return failureEnvelopeSchema.parse(await res.json()).error.code;
}

// A Supabase that knows each test user by an address made from their id.
function fakeAdmin(overrides: Partial<SupabaseAdmin> = {}) {
  const emailOf = vi.fn<SupabaseAdmin["emailOf"]>((userId) => Promise.resolve(`${userId}@example.com`));
  const magicLink = vi.fn<SupabaseAdmin["magicLink"]>((email) => {
    const userId = email.slice(0, email.indexOf("@"));
    return Promise.resolve({ userId, tokenHash: `hash-for-${userId}` });
  });
  return { emailOf, magicLink, ...overrides };
}

describe("POST /extension-sessions", () => {
  it("mints a one-time token for the caller's own account", async () => {
    const admin = fakeAdmin();
    const res = await mint(createTestApp({ supabaseAdmin: admin }), a.headers);

    expect(res.status).toBe(200);
    expect(successEnvelopeSchema(extensionSessionSchema).parse(await res.json()).data).toEqual({ tokenHash: `hash-for-${a.id}` });
    expect(admin.magicLink).toHaveBeenCalledExactlyOnceWith(`${a.id}@example.com`);
  });

  it("mints B's token for B, never A's", async () => {
    const admin = fakeAdmin();
    const app = createTestApp({ supabaseAdmin: admin });
    await mint(app, a.headers);

    const res = await mint(app, b.headers);

    expect(successEnvelopeSchema(extensionSessionSchema).parse(await res.json()).data).toEqual({ tokenHash: `hash-for-${b.id}` });
    expect(admin.emailOf).toHaveBeenLastCalledWith(b.id);
    expect(admin.magicLink).toHaveBeenLastCalledWith(`${b.id}@example.com`);
  });

  it("is never cached", async () => {
    const res = await mint(createTestApp({ supabaseAdmin: fakeAdmin() }), a.headers);

    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("needs a signed-in user", async () => {
    const admin = fakeAdmin();
    const res = await mint(createTestApp({ supabaseAdmin: admin }));

    expect(res.status).toBe(401);
    expect(await errorCode(res)).toBe("UNAUTHENTICATED");
    expect(admin.emailOf).not.toHaveBeenCalled();
  });

  it("answers UPSTREAM when the Supabase secret key is not configured", async () => {
    const res = await mint(createTestApp({ supabaseAdmin: undefined }), a.headers);

    expect(res.status).toBe(502);
    expect(failureEnvelopeSchema.parse(await res.json()).error).toMatchObject({
      code: "UPSTREAM",
      message: "Signing in the extension from linkables.app is unavailable right now. Use Google or an email code.",
    });
  });

  it.each<[string, Partial<SupabaseAdmin>]>([
    ["the account lookup fails", { emailOf: () => Promise.reject(new Error("getUserById answered 500")) }],
    ["the link cannot be made", { magicLink: () => Promise.reject(new Error("generateLink answered 500")) }],
  ])("answers UPSTREAM when %s, logging without naming the user", async (_case, overrides) => {
    const { logger, lines } = captureLogger();
    const res = await mint(createTestApp({ logger, supabaseAdmin: fakeAdmin(overrides) }), a.headers);

    expect(res.status).toBe(502);
    expect(await errorCode(res)).toBe("UPSTREAM");
    expect(lines.join("\n")).toContain("answered 500");
    expect(lines.join("\n")).not.toContain(a.id);
  });

  it("answers UPSTREAM for an account with no email address", async () => {
    const admin = fakeAdmin({ emailOf: () => Promise.resolve(undefined) });
    const res = await mint(createTestApp({ supabaseAdmin: admin }), a.headers);

    expect(await errorCode(res)).toBe("UPSTREAM");
    expect(admin.magicLink).not.toHaveBeenCalled();
  });

  it("refuses a token Supabase made for a different account", async () => {
    const admin = fakeAdmin({ magicLink: () => Promise.resolve({ userId: b.id, tokenHash: "hash-for-b" }) });
    const res = await mint(createTestApp({ supabaseAdmin: admin }), a.headers);
    const text = await res.text();

    expect(res.status).toBe(500);
    expect(failureEnvelopeSchema.parse(JSON.parse(text)).error.code).toBe("INTERNAL");
    expect(text).not.toContain("hash-for-b");
  });

  it("refuses a 21st token within the hour for the same user", async () => {
    let at = NOW;
    const app = createTestApp({ now: () => at, supabaseAdmin: fakeAdmin() });

    for (let i = 0; i < 20; i += 1) expect((await mint(app, a.headers)).status).toBe(200);
    const limited = await mint(app, a.headers);

    expect(limited.status).toBe(429);
    expect(await errorCode(limited)).toBe("RATE_LIMIT");
    expect((await mint(app, b.headers)).status).toBe(200);
    at = NOW + 60 * 60 * 1000;
    expect((await mint(app, a.headers)).status).toBe(200);
  });
});
