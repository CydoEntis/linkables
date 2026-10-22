import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { env } from "../config/env";
import { supabase } from "./supabase";

export type SendLinkProblem = "invalid-email" | "rate-limited" | "offline" | "not-allowed" | "failed";
export type SendLinkResult = { ok: true } | { ok: false; problem: SendLinkProblem };

const RATE_LIMIT_CODES = new Set(["over_email_send_rate_limit", "over_request_rate_limit"]);
const INVALID_EMAIL_CODES = new Set(["email_address_invalid", "validation_failed"]);
const NOT_ALLOWED_CODES = new Set(["email_address_not_authorized", "otp_disabled", "signup_disabled"]);

export async function sendMagicLink(email: string): Promise<SendLinkResult> {
  if (!navigator.onLine) return { ok: false, problem: "offline" };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: env.VITE_AUTH_REDIRECT_URL },
  });
  return error ? { ok: false, problem: sendLinkProblem(error) } : { ok: true };
}

function sendLinkProblem(error: AuthError): SendLinkProblem {
  // Status 0 means no response at all; 502-504 are retryable too but reached Supabase.
  if (isAuthRetryableFetchError(error) && error.status === 0) return "offline";
  if (!isAuthApiError(error) || error.code === undefined) return "failed";
  if (error.status === 429 || RATE_LIMIT_CODES.has(error.code)) return "rate-limited";
  if (INVALID_EMAIL_CODES.has(error.code)) return "invalid-email";
  if (NOT_ALLOWED_CODES.has(error.code)) return "not-allowed";
  return "failed";
}
