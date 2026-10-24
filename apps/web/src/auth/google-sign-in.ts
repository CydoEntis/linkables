import { supabase } from "./supabase";

// Google returns to the sign-in page; the AuthGate then routes on to any pending save.
export const GOOGLE_RETURN_PATH = "/sign-in";

export type GoogleSignInResult = { ok: true } | { ok: false; problem: "offline" | "google-failed" };

// On success the browser leaves for Google, so the result only matters when it fails.
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!navigator.onLine) return { ok: false, problem: "offline" };
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + GOOGLE_RETURN_PATH },
  });
  return error ? { ok: false, problem: "google-failed" } : { ok: true };
}
