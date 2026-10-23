import { peekAccessToken, readAccessToken, rememberSession } from "../auth/access-token";
import { signOut, supabase } from "../auth/supabase";
import { env } from "../config/env";
import { createApiClient } from "./client";

// Keeps the held token current through refreshes and sign-out.
supabase.auth.onAuthStateChange((_event, session) => { rememberSession(session); });

export const api = createApiClient({
  baseUrl: env.VITE_API_URL,
  getAccessToken: () => readAccessToken(supabase),
  peekAccessToken: () => peekAccessToken(),
  onUnauthenticated: signOut,
});
