import { createClient, type AuthError } from "@supabase/supabase-js";

// Rule 2 exception, allowlisted in eslint.config.js: this calls only the auth admin
// API of the configured SUPABASE_URL with our own secret key, never a saved URL,
// so it needs no SSRF guard.
const TIMEOUT_MS = 10_000;

export type SignInLink = { userId: string; tokenHash: string };

export type SupabaseAdmin = {
  // undefined for an account with no email address.
  emailOf: (userId: string) => Promise<string | undefined>;
  magicLink: (email: string) => Promise<SignInLink>;
};

export type SupabaseAdminOptions = { url: string; secretKey: string; fetch?: typeof fetch };

function withTimeout(send: typeof fetch): typeof fetch {
  return (input, init) => {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return send(input, { ...init, signal });
  };
}

// The status and code alone: an auth error's message can quote the email address.
function adminError(call: string, error: AuthError): Error {
  return new Error(`${call} answered ${String(error.status ?? "no status")} ${error.code ?? ""}`.trim());
}

export function supabaseAdmin({ url, secretKey, fetch: send = fetch }: SupabaseAdminOptions): SupabaseAdmin {
  const { auth } = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: withTimeout(send) },
  });
  return {
    async emailOf(userId) {
      const { data, error } = await auth.admin.getUserById(userId);
      if (error) throw adminError("getUserById", error);
      return data.user.email || undefined;
    },
    // generateLink makes the link without sending an email.
    async magicLink(email) {
      const { data, error } = await auth.admin.generateLink({ type: "magiclink", email });
      if (error) throw adminError("generateLink", error);
      return { userId: data.user.id, tokenHash: data.properties.hashed_token };
    },
  };
}

// NODE_ENV=test only (server.ts), so the e2e suites can sign the extension in with
// no Supabase: each user's address and token hash are made from their id.
export const testTokenHash = (userId: string) => `test-token-hash-${userId}`;

export const testSupabaseAdmin: SupabaseAdmin = {
  emailOf: (userId) => Promise.resolve(`${userId}@users.test`),
  magicLink: (email) => {
    const userId = email.slice(0, email.indexOf("@"));
    return Promise.resolve({ userId, tokenHash: testTokenHash(userId) });
  },
};
