import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { isSignInReturn } from "./sign-in-return";

// Read before createClient: supabase-js strips the tokens from the URL once it has the session.
export const returningFromSignIn = isSignInReturn(window.location.href);

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Local scope ends this browser's session only. supabase-js removes the stored
// session even when the server-side revoke fails, so its error changes nothing here.
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}

// After the account is deleted: ends every session, the extension's and other
// devices' too. As with signOut, this browser's session goes even if the revoke fails.
export async function signOutEverywhere(): Promise<void> {
  await supabase.auth.signOut({ scope: "global" });
}
