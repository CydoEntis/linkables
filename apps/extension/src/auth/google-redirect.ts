export type GoogleRedirect =
  | { kind: "code"; code: string }
  | { kind: "error"; error: string; description: string | undefined };

// Supabase's PKCE flow returns ?code=, and its errors come back in the query or the hash.
export function readGoogleRedirect(redirectUrl: string | undefined): GoogleRedirect {
  const url = redirectUrl === undefined ? null : URL.parse(redirectUrl);
  const query = url?.searchParams ?? new URLSearchParams();
  const hash = new URLSearchParams(url?.hash.slice(1) ?? "");
  const read = (key: string) => query.get(key) ?? hash.get(key) ?? undefined;
  const error = read("error");
  if (error !== undefined) return { kind: "error", error, description: read("error_description") };
  const code = read("code");
  return code ? { kind: "code", code } : { kind: "error", error: "no_code", description: undefined };
}
