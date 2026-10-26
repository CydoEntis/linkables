import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";
import { authStorage } from "./chrome-storage";

// supabase-js's own default key, named here so the pop-up can watch it for a
// session the worker writes. Changing it would sign every user out.
export const AUTH_STORAGE_KEY = `sb-${new URL(env.VITE_SUPABASE_URL).hostname.split(".")[0] ?? ""}-auth-token`;

type ClientOptions = { autoRefreshToken: boolean; flowType: "implicit" | "pkce" };

// The pop-up and the worker each hold a client over the one stored session.
export function createSupabase({ autoRefreshToken, flowType }: ClientOptions) {
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: {
      storage: authStorage(chrome.storage.local, chrome.storage.session),
      storageKey: AUTH_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken,
      detectSessionInUrl: false,
      flowType,
    },
  });
}
