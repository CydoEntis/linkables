import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { resumeAutoConnect } from "../connect/auto-connect";
import { supabase } from "./supabase";

export const CODE_LENGTH = 6;

export type SendCodeProblem = "not-invited" | "invalid-email" | "rate-limited" | "offline" | "failed";
export type VerifyCodeProblem = "wrong-code" | "rate-limited" | "offline" | "failed";
type Result<P> = { ok: true } | { ok: false; problem: P };

const RATE_LIMIT_CODES = new Set(["over_email_send_rate_limit", "over_request_rate_limit"]);
const INVALID_EMAIL_CODES = new Set(["email_address_invalid", "validation_failed"]);
// With shouldCreateUser off, an address with no account gets otp_disabled.
const NOT_INVITED_CODES = new Set(["otp_disabled", "signup_disabled", "user_not_found", "email_address_not_authorized"]);

// Pasted codes arrive as "123 456" or inside a sentence; the newest six digits are the code.
export function toCodeDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(-CODE_LENGTH);
}

// Sign-up is invite-only, so the extension never creates an account; the
// email's link signs in on the web, and the code signs in here.
export async function sendCode(email: string): Promise<Result<SendCodeProblem>> {
  if (!navigator.onLine) return { ok: false, problem: "offline" };
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  return error ? { ok: false, problem: sendCodeProblem(error) } : { ok: true };
}

export async function verifyCode(email: string, token: string): Promise<Result<VerifyCodeProblem>> {
  if (!navigator.onLine) return { ok: false, problem: "offline" };
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { ok: false, problem: verifyCodeProblem(error) };
  // A sign-out by hand paused the sign-in from linkables.app; signing in again ends that.
  await resumeAutoConnect(chrome.storage.local);
  return { ok: true };
}

// Status 0 is no response at all; 502-504 are retryable too but did reach Supabase.
const isOffline = (error: AuthError) => isAuthRetryableFetchError(error) && error.status === 0;
const isRateLimited = (error: AuthError) => error.status === 429 || RATE_LIMIT_CODES.has(error.code ?? "");

function sendCodeProblem(error: AuthError): SendCodeProblem {
  if (isOffline(error)) return "offline";
  if (!isAuthApiError(error) || error.code === undefined) return "failed";
  if (isRateLimited(error)) return "rate-limited";
  if (INVALID_EMAIL_CODES.has(error.code)) return "invalid-email";
  if (NOT_INVITED_CODES.has(error.code)) return "not-invited";
  return "failed";
}

function verifyCodeProblem(error: AuthError): VerifyCodeProblem {
  if (isOffline(error)) return "offline";
  if (!isAuthApiError(error) || error.status >= 500) return "failed";
  if (isRateLimited(error)) return "rate-limited";
  return "wrong-code";
}

export const SIGN_IN_MESSAGES: Record<SendCodeProblem | VerifyCodeProblem, string> = {
  "not-invited": "There's no linkables account for this email. linkables is invite-only for now.",
  "invalid-email": "Enter an email address, like you@example.com",
  "rate-limited": "Too many tries. Wait a minute, then try again.",
  offline: "You're offline. Check your connection and try again.",
  failed: "Something went wrong. Try again.",
  "wrong-code": "That code didn't work. Check it, or send a new one.",
};
