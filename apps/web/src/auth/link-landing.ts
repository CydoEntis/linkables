import { isAuthImplicitGrantRedirectError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type LinkProblem = "expired" | "invalid";

// Supabase redirects a used or expired magic link back with #error_code=... in the URL.
export async function readLinkProblem(): Promise<LinkProblem | null> {
  const { error } = await supabase.auth.initialize();
  if (!isAuthImplicitGrantRedirectError(error)) return null;
  window.history.replaceState(null, "", window.location.pathname);
  return error.details?.code === "otp_expired" ? "expired" : "invalid";
}
