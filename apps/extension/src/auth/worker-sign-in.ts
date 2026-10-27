import { resumeAutoConnect } from "../connect/auto-connect";
import type { GoogleAnswer } from "../connect/worker-messages";
import { AUTH_STORAGE_KEY, createSupabase } from "./create-supabase";
import { readGoogleRedirect } from "./google-redirect";

// The worker signs in and leaves refreshing to the pop-up: two clients refreshing
// one rotating refresh token could trip Supabase's reuse detection. PKCE because
// the Google code comes back to chrome.identity, not to a page of ours.
const supabase = createSupabase({ autoRefreshToken: false, flowType: "pkce" });

// Read straight from storage: getSession would refresh an expired session here.
export async function hasSession(): Promise<boolean> {
  return typeof (await chrome.storage.local.get(AUTH_STORAGE_KEY))[AUTH_STORAGE_KEY] === "string";
}

export async function verifyTokenHash(tokenHash: string): Promise<boolean> {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  return error === null;
}

// Chrome rejects with "did not approve" when the user closes the Google window, Firefox with "cancelled".
const USER_CLOSED = /did not approve|cancel/i;

type AuthFlow = { redirect: string | undefined } | { problem: "cancelled" | "failed" };

async function runAuthFlow(url: string): Promise<AuthFlow> {
  try {
    return { redirect: await chrome.identity.launchWebAuthFlow({ url, interactive: true }) };
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    return { problem: USER_CLOSED.test(error.message) ? "cancelled" : "failed" };
  }
}

// Runs in the worker because Chrome closes the pop-up as the Google window opens.
export async function signInWithGoogle(): Promise<GoogleAnswer> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: chrome.identity.getRedirectURL(), skipBrowserRedirect: true },
  });
  if (error !== null || !data.url) return { ok: false, problem: "failed" };
  const flow = await runAuthFlow(data.url);
  if ("problem" in flow) return { ok: false, problem: flow.problem };
  const returned = readGoogleRedirect(flow.redirect);
  if (returned.kind === "error") return { ok: false, problem: returned.error === "access_denied" ? "cancelled" : "failed" };
  const exchanged = await supabase.auth.exchangeCodeForSession(returned.code);
  if (exchanged.error !== null) return { ok: false, problem: "failed" };
  // A sign-out by hand paused the sign-in from linkables.app; signing in again ends that.
  await resumeAutoConnect(chrome.storage.local);
  return { ok: true };
}
