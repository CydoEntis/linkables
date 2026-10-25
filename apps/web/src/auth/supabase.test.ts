import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { storeSession } from "../test/session";
import { signOutEverywhere, supabase } from "./supabase";

const logout = vi.fn<typeof fetch>();

beforeEach(() => {
  logout.mockReset().mockResolvedValue(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", logout);
});
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});

async function signedIn() {
  storeSession("token-1");
  await supabase.auth.getSession();
}

it("revokes every session, not just this browser's", async () => {
  await signedIn();

  await signOutEverywhere();

  expect(logout).toHaveBeenCalledWith(expect.stringContaining("/logout?scope=global"), expect.anything());
  expect((await supabase.auth.getSession()).data.session).toBeNull();
});

it("still signs this browser out when the global revoke fails", async () => {
  await signedIn();
  logout.mockRejectedValue(new TypeError("Failed to fetch"));

  await signOutEverywhere();

  expect((await supabase.auth.getSession()).data.session).toBeNull();
});
