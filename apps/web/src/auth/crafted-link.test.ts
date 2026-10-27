import { afterEach, expect, it, vi } from "vitest";

const userJson = JSON.stringify({ id: "attacker", aud: "authenticated", role: "authenticated", email: "attacker@example.test", app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

async function openWithFragment(fragment: string) {
  vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(new Response(userJson, { status: 200 }))));
  window.history.replaceState(null, "", `/${fragment}`);
  vi.resetModules();
  return import("./supabase");
}

it("does not sign in from someone else's tokens in the URL fragment", async () => {
  const { supabase } = await openWithFragment("#access_token=attacker-access&refresh_token=attacker-refresh&expires_in=3600&token_type=bearer");

  await supabase.auth.initialize();

  expect((await supabase.auth.getSession()).data.session).toBeNull();
  expect(Object.keys(localStorage).filter((key) => key.endsWith("-auth-token"))).toEqual([]);
});
