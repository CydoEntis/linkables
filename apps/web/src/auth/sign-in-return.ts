export const SIGN_IN_ERROR_PARAMS = ["error", "error_code", "error_description"];

// Supabase returns tokens in the hash; errors come back in the hash or the query.
export function isSignInReturn(href: string): boolean {
  const url = new URL(href);
  const found = (params: URLSearchParams) => params.has("access_token") || SIGN_IN_ERROR_PARAMS.some((key) => params.has(key));
  return found(new URLSearchParams(url.hash.slice(1))) || found(url.searchParams);
}
