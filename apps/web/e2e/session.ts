import { mintToken } from "../../api/test/auth/tokens";
import { SUPABASE_URL } from "./env";

export type TestUser = { id: string; email: string; accessToken: string };

// supabase-js derives its default storage key from the first hostname label
// (SupabaseClient's defaultStorageKey); the app does not override it.
const STORAGE_KEY = `sb-${new URL(SUPABASE_URL).hostname.split(".")[0] ?? ""}-auth-token`;

// supabase-js refreshes a session within 90 s of expires_at, and a refresh would
// call the dummy Supabase origin, so the session outlives any test run.
const SESSION_SECONDS = 24 * 60 * 60;

export async function createTestUser(): Promise<TestUser> {
  const id = crypto.randomUUID();
  const email = `${id}@e2e.test`;
  const exp = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const accessToken = await mintToken({ sub: id, supabaseUrl: SUPABASE_URL, claims: { email, exp } });
  return { id, email, accessToken };
}

function sessionJson(user: TestUser): string {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return JSON.stringify({
    access_token: user.accessToken,
    refresh_token: "e2e-refresh-token",
    token_type: "bearer",
    expires_in: SESSION_SECONDS,
    expires_at: expiresAt,
    user: {
      id: user.id,
      email: user.email,
      aud: "authenticated",
      role: "authenticated",
      app_metadata: {},
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  });
}

export function signedInState(user: TestUser, origin: string) {
  return {
    cookies: [],
    origins: [{ origin, localStorage: [{ name: STORAGE_KEY, value: sessionJson(user) }] }],
  };
}
