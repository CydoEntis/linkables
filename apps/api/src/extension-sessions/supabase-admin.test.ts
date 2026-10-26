import { describe, expect, it } from "vitest";
import { supabaseAdmin } from "./supabase-admin";

const URL_BASE = "https://ref.supabase.co";
const USER_ID = "0b6e2f3a-5c1d-4e8f-9a2b-3c4d5e6f7a81";
const EMAIL = "sam@example.com";
const user = { id: USER_ID, email: EMAIL, aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "2026-10-01T00:00:00Z" };

type Sent = { url: string; method: string; apikey: string | null; body: unknown };

function fakeSupabase(answer: (url: string) => Response) {
  const sent: Sent[] = [];
  const fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof Request ? input.url : String(input);
    const headers = new Headers(init?.headers);
    sent.push({ url, method: init?.method ?? "GET", apikey: headers.get("apikey"), body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    return Promise.resolve(answer(url));
  };
  return { sent, admin: supabaseAdmin({ url: URL_BASE, secretKey: "sb_secret_test", fetch }) };
}

describe("supabaseAdmin", () => {
  it("reads the account's email from the auth admin API", async () => {
    const { sent, admin } = fakeSupabase(() => Response.json(user));

    await expect(admin.emailOf(USER_ID)).resolves.toBe(EMAIL);
    expect(sent).toMatchObject([{ url: `${URL_BASE}/auth/v1/admin/users/${USER_ID}`, method: "GET", apikey: "sb_secret_test" }]);
  });

  it("asks for a magic link and returns its hashed token with the account it is for", async () => {
    const { sent, admin } = fakeSupabase(() =>
      Response.json({ ...user, action_link: "https://x", email_otp: "123456", hashed_token: "hashed", redirect_to: "", verification_type: "magiclink" }),
    );

    await expect(admin.magicLink(EMAIL)).resolves.toEqual({ userId: USER_ID, tokenHash: "hashed" });
    expect(sent).toMatchObject([{ url: `${URL_BASE}/auth/v1/admin/generate_link`, method: "POST", body: { type: "magiclink", email: EMAIL } }]);
  });

  it("fails with the status alone, never the email", async () => {
    const { admin } = fakeSupabase(() => Response.json({ code: 422, error_code: "validation_failed", msg: `bad ${EMAIL}` }, { status: 422 }));

    const error = await admin.magicLink(EMAIL).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect(String(error)).toContain("generateLink answered 422");
    expect(String(error)).not.toContain(EMAIL);
  });
});
