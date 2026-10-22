import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

// Read before createClient: supabase-js strips the tokens from the URL once it has the session.
export const openedFromEmailLink = /[#&](access_token|error_code)=/.test(window.location.hash);

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Local scope ends this browser's session only. supabase-js removes the stored
// session even when the server-side revoke fails, so its error changes nothing here.
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}
