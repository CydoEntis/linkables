import { pauseAutoConnect } from "../connect/auto-connect";
import { createSupabase } from "./create-supabase";

export const supabase = createSupabase({ autoRefreshToken: true, flowType: "implicit" });

// Local scope ends this browser's extension session only; supabase-js drops the
// stored session even when the server-side revoke fails.
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}

// Signing out by hand pauses the sign-in from linkables.app, or the next visit
// there would sign the extension straight back in.
export async function signOutByHand(): Promise<void> {
  await pauseAutoConnect(chrome.storage.local);
  await signOut();
}
