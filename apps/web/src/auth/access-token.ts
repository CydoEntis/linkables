import type { Session, SupabaseClient } from "@supabase/supabase-js";

// A session that cannot be read or refreshed is treated as signed out: the API
// then answers UNAUTHENTICATED and the client signs out.
export async function readAccessToken(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  rememberSession(data.session);
  return data.session?.access_token ?? null;
}

type HeldToken = { token: string; expiresAtMs: number };

let held: HeldToken | null = null;

// The last session read, kept so peekAccessToken can answer without awaiting.
export function rememberSession(session: Session | null): void {
  held = session?.expires_at === undefined ? null : { token: session.access_token, expiresAtMs: session.expires_at * 1000 };
}

// A minute short of expiry counts as expired, so a token peeked now is still good when it lands.
const EXPIRY_MARGIN_MS = 60_000;

export function peekAccessToken(now = Date.now()): string | null {
  return held !== null && held.expiresAtMs - EXPIRY_MARGIN_MS > now ? held.token : null;
}
