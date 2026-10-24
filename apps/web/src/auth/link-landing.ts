import { isAuthImplicitGrantRedirectError } from "@supabase/supabase-js";
import { GOOGLE_RETURN_PATH } from "./google-sign-in";
import { SIGN_IN_ERROR_PARAMS } from "./sign-in-return";
import { supabase } from "./supabase";

export type LinkProblem = "expired" | "invalid" | "google-failed";

// Supabase redirects a failed sign-in back with error=... in the hash or query. Some OAuth
// failures (lost flow state) go to the Site URL, not redirectTo, so the code is checked first;
// otherwise the path decides: email links land on the app root, Google on the sign-in page.
export async function readLinkProblem(): Promise<LinkProblem | null> {
  const { error } = await supabase.auth.initialize();
  if (!isAuthImplicitGrantRedirectError(error)) return null;
  const code = error.details?.code ?? "";
  const fromGoogle = isOAuthErrorCode(code) || window.location.pathname === GOOGLE_RETURN_PATH;
  removeSignInErrorFromUrl();
  if (fromGoogle) return "google-failed";
  return code === "otp_expired" ? "expired" : "invalid";
}

function isOAuthErrorCode(code: string): boolean {
  return code.startsWith("bad_oauth_") || code.startsWith("provider_");
}

function removeSignInErrorFromUrl(): void {
  const search = new URLSearchParams(window.location.search);
  for (const key of SIGN_IN_ERROR_PARAMS) search.delete(key);
  const query = search.toString();
  window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
}
