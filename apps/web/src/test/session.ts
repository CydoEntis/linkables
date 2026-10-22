import { vi } from "vitest";
import { env } from "../config/env";

// supabase-js's default key for this project URL; the app's client reads it from localStorage.
const [projectRef = ""] = new URL(env.VITE_SUPABASE_URL).hostname.split(".");
const STORAGE_KEY = `sb-${projectRef}-auth-token`;

export function storeSession(accessToken: string): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      access_token: accessToken,
      refresh_token: "refresh",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: "user-1", aud: "authenticated", app_metadata: {}, user_metadata: {}, created_at: "" },
    }),
  );
}

// Answers supabase-js's logout call so signOut never reaches the network.
export function stubAuthServer(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(null, { status: 204 }))),
  );
}
