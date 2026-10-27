import { type AuthError, isAuthApiError, isAuthImplicitGrantRedirectError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { GOOGLE_RETURN_PATH } from "./google-sign-in";
import { isSignInReturn, SIGN_IN_QUERY_PARAMS } from "./sign-in-return";
import { supabase } from "./supabase";

export type LinkProblem = "expired" | "invalid" | "google-failed" | "offline";

// Supabase redirects a failed sign-in back with error=... in the hash or query. Some OAuth
// failures (lost flow state) go to the Site URL, not redirectTo, so the code is checked first;
// otherwise the path decides: email links land on the app root, Google on the sign-in page.
// A return that is left over after initialize() did not sign anyone in: a ?code= that failed
// to exchange, or that came from a browser holding no matching verifier (the link was opened
// elsewhere), or tokens in the hash, which the PKCE client refuses.
export async function readLinkProblem(): Promise<LinkProblem | null> {
  const { error } = await supabase.auth.initialize();
  // The code stays in the URL so a reload can retry the exchange.
  if (isAuthRetryableFetchError(error)) return "offline";
  const code = failureCode(error);
  if (code === null && !isSignInReturn(window.location.href)) return null;
  removeSignInParamsFromUrl();
  if (isOAuthErrorCode(code ?? "") || window.location.pathname === GOOGLE_RETURN_PATH) return "google-failed";
  return EXPIRED_CODES.has(code ?? "") ? "expired" : "invalid";
}

const EXPIRED_CODES = new Set(["otp_expired", "flow_state_expired"]);

function failureCode(error: AuthError | null): string | null {
  if (isAuthImplicitGrantRedirectError(error)) return error.details?.code ?? "";
  return isAuthApiError(error) ? (error.code ?? "") : null;
}

function isOAuthErrorCode(code: string): boolean {
  return code.startsWith("bad_oauth_") || code.startsWith("provider_");
}

function removeSignInParamsFromUrl(): void {
  const search = new URLSearchParams(window.location.search);
  for (const key of SIGN_IN_QUERY_PARAMS) search.delete(key);
  const query = search.toString();
  window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));
}
