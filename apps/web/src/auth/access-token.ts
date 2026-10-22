import type { SupabaseClient } from "@supabase/supabase-js";

// A session that cannot be read or refreshed is treated as signed out: the API
// then answers UNAUTHENTICATED and the client signs out.
export async function readAccessToken(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
