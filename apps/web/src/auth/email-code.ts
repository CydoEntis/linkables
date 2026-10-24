import { isAuthApiError, isAuthRetryableFetchError, type AuthError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export const CODE_LENGTH = 6;

export type VerifyCodeProblem = "wrong-code" | "rate-limited" | "offline" | "failed";
export type VerifyCodeResult = { ok: true } | { ok: false; problem: VerifyCodeProblem };

// Pasted codes arrive as "123 456" or inside a sentence; the digits are the code.
// The newest digits win, so a code pasted after an old one replaces it.
export function toCodeDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(-CODE_LENGTH);
}

// type "email" covers the code from both the magic-link and the confirm-signup email.
export async function verifyEmailCode(email: string, token: string): Promise<VerifyCodeResult> {
  if (!navigator.onLine) return { ok: false, problem: "offline" };
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  return error ? { ok: false, problem: verifyCodeProblem(error) } : { ok: true };
}

function verifyCodeProblem(error: AuthError): VerifyCodeProblem {
  if (isAuthRetryableFetchError(error) && error.status === 0) return "offline";
  if (!isAuthApiError(error) || error.status >= 500) return "failed";
  if (error.status === 429 || error.code === "over_request_rate_limit") return "rate-limited";
  return "wrong-code";
}
