import { readAccessToken } from "../auth/access-token";
import { signOut, supabase } from "../auth/supabase";
import { env } from "../config/env";
import { createApiClient } from "./client";

export const api = createApiClient({
  baseUrl: env.VITE_API_URL,
  getAccessToken: () => readAccessToken(supabase),
  onUnauthenticated: signOut,
});
