import type { User } from "@supabase/supabase-js";

// app_metadata.provider is how the account was first made: "google" for Google,
// "email" for the emailed code. Anything else gets no line rather than a guess.
export function signInMethod(user: Pick<User, "app_metadata">): string | undefined {
  const provider: unknown = user.app_metadata.provider;
  if (provider === "google") return "Signed in with Google";
  if (provider === "email") return "Signed in with an email code";
  return undefined;
}
