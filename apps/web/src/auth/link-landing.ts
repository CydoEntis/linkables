import { isAuthImplicitGrantRedirectError } from "@supabase/supabase-js";
import { GOOGLE_RETURN_PATH } from "./google-sign-in";
import { SIGN_IN_ERROR_PARAMS } from "./sign-in-return";
import { supabase } from "./supabase";

export type LinkProblem = "expired" | "invalid" | "google-failed";

// Supabase redirects a failed sign-in back with error=... in the hash or query. Email links
// land on the app root and Google on the sign-in page, so the path says which one failed.
export async function readLinkProblem(): Promise<LinkProblem | null> {
  const { error } = await supabase.auth.initialize();
  if (!isAuthImplicitGrantRedirectError(error)) return null;
  const fromGoogle = window.location.pathname === GOOGLE_RETURN_PATH;
  removeSignInErrorFromUrl();
  if (fromGoogle) return "google-failed";
  return error.details?.code === "otp_expired" ? "expired" : "invalid";
}

function removeSignInErrorFromUrl(): void {
  const search = new URLSearchParams(window.location.search);
  for (const key of SIGN_IN_ERROR_PARAMS) search.delete(key);
  const query = search.toString();
  window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
}
