import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { chromeStorage } from "./chrome-storage";

export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorage(chrome.storage.local),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// Local scope ends this browser's extension session only; supabase-js drops the
// stored session even when the server-side revoke fails.
export async function signOut(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}
