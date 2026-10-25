import { signOut, supabase } from "../auth/supabase";
import { env } from "../config/env";
import { createApiClient } from "./client";

// getSession refreshes an expired token first, so every call carries a current one.
async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export const api = createApiClient({
  baseUrl: env.VITE_APP_URL,
  getAccessToken: accessToken,
  onUnauthenticated: signOut,
});
