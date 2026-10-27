const SIGN_IN_ERROR_PARAMS = ["error", "error_code", "error_description"];
// supabase-js's own name for the id it adds to a PKCE return.
const PKCE_PARAMS = ["code", "sb_flow_id"];
export const SIGN_IN_QUERY_PARAMS = [...SIGN_IN_ERROR_PARAMS, ...PKCE_PARAMS];

// A PKCE return carries ?code=, an error comes back in the hash or the query, and tokens in the
// hash are not a return this app asked for but are recognised so they can be refused and cleared.
export function isSignInReturn(href: string): boolean {
  const url = new URL(href);
  const found = (params: URLSearchParams) => params.has("access_token") || params.has("code") || SIGN_IN_ERROR_PARAMS.some((key) => params.has(key));
  return found(new URLSearchParams(url.hash.slice(1))) || found(url.searchParams);
}

// The PKCE client refuses tokens in the fragment but leaves them in the URL and history, signed in or not.
export function removeRejectedTokensFromUrl(): void {
  const { hash, pathname, search } = window.location;
  if (new URLSearchParams(hash.slice(1)).has("access_token")) window.history.replaceState(null, "", pathname + search);
}
