import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { toCodeDigits, verifyEmailCode } from "./email-code";

const verifyOtp = vi.hoisted(() => vi.fn());
vi.mock("./supabase", () => ({ supabase: { auth: { verifyOtp } } }));

beforeEach(() => {
  verifyOtp.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("keeps only the digits of a pasted code", () => {
  expect(toCodeDigits("123 456")).toBe("123456");
});

it("keeps the newest six digits when more arrive", () => {
  expect(toCodeDigits("111111222222")).toBe("222222");
});

it("verifies the code as an email OTP for the address", async () => {
  verifyOtp.mockResolvedValue({ data: {}, error: null });
  await expect(verifyEmailCode("owner@example.com", "123456")).resolves.toEqual({ ok: true });
  expect(verifyOtp).toHaveBeenCalledWith({ email: "owner@example.com", token: "123456", type: "email" });
});

it("reports a wrong or expired code", async () => {
  verifyOtp.mockResolvedValue({ data: {}, error: new AuthApiError("Token has expired or is invalid", 403, "otp_expired") });
  await expect(verifyEmailCode("owner@example.com", "000000")).resolves.toEqual({ ok: false, problem: "wrong-code" });
});

it("reports too many tries when Supabase rate-limits", async () => {
  verifyOtp.mockResolvedValue({ data: {}, error: new AuthApiError("Too many requests", 429, "over_request_rate_limit") });
  await expect(verifyEmailCode("owner@example.com", "123456")).resolves.toEqual({ ok: false, problem: "rate-limited" });
});

it("reports offline when Supabase cannot be reached", async () => {
  verifyOtp.mockResolvedValue({ data: {}, error: new AuthRetryableFetchError("Failed to fetch", 0) });
  await expect(verifyEmailCode("owner@example.com", "123456")).resolves.toEqual({ ok: false, problem: "offline" });
});

it("reports a failure when Supabase errors on its side", async () => {
  verifyOtp.mockResolvedValue({ data: {}, error: new AuthApiError("Internal error", 500, "unexpected_failure") });
  await expect(verifyEmailCode("owner@example.com", "123456")).resolves.toEqual({ ok: false, problem: "failed" });
});

it("reports offline without asking Supabase when the browser is offline", async () => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  await expect(verifyEmailCode("owner@example.com", "123456")).resolves.toEqual({ ok: false, problem: "offline" });
  expect(verifyOtp).not.toHaveBeenCalled();
});
