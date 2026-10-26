import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAutoConnectPaused, pauseAutoConnect } from "../connect/auto-connect";
import { memoryStorageArea } from "../test/memory-storage-area";
import { sendCode, toCodeDigits, verifyCode } from "./email-code";

const signInWithOtp = vi.hoisted(() => vi.fn());
const verifyOtp = vi.hoisted(() => vi.fn());
vi.mock("./supabase", () => ({ supabase: { auth: { signInWithOtp, verifyOtp } } }));

let local: chrome.storage.StorageArea;

beforeEach(() => {
  signInWithOtp.mockReset();
  verifyOtp.mockReset();
  local = memoryStorageArea();
  vi.stubGlobal("chrome", { storage: { local } });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("verifyCode and the sign-in from linkables.app", () => {
  it("resumes it once the code signs in", async () => {
    await pauseAutoConnect(local);
    verifyOtp.mockResolvedValue({ data: {}, error: null });

    await verifyCode("friend@example.com", "123456");

    await expect(isAutoConnectPaused(local)).resolves.toBe(false);
  });

  it("leaves it paused when the code is wrong", async () => {
    await pauseAutoConnect(local);
    verifyOtp.mockResolvedValue(apiError(403, "otp_expired"));

    await verifyCode("friend@example.com", "000000");

    await expect(isAutoConnectPaused(local)).resolves.toBe(true);
  });
});

const apiError = (status: number, code: string) => ({ data: {}, error: new AuthApiError("Nope", status, code) });

describe("sendCode", () => {
  it("emails a code without creating an account", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    await expect(sendCode("friend@example.com")).resolves.toEqual({ ok: true });
    expect(signInWithOtp).toHaveBeenCalledWith({ email: "friend@example.com", options: { shouldCreateUser: false } });
  });

  it.each(["otp_disabled", "signup_disabled", "user_not_found", "email_address_not_authorized"])(
    "reports an address with no invite when Supabase answers %s",
    async (code) => {
      signInWithOtp.mockResolvedValue(apiError(422, code));
      await expect(sendCode("stranger@example.com")).resolves.toEqual({ ok: false, problem: "not-invited" });
    },
  );

  it("reports an address Supabase rejects as invalid", async () => {
    signInWithOtp.mockResolvedValue(apiError(400, "email_address_invalid"));
    await expect(sendCode("friend@")).resolves.toEqual({ ok: false, problem: "invalid-email" });
  });

  it("reports too many tries when Supabase rate-limits the email", async () => {
    signInWithOtp.mockResolvedValue(apiError(429, "over_email_send_rate_limit"));
    await expect(sendCode("friend@example.com")).resolves.toEqual({ ok: false, problem: "rate-limited" });
  });

  it("reports offline when Supabase cannot be reached", async () => {
    signInWithOtp.mockResolvedValue({ data: {}, error: new AuthRetryableFetchError("Failed to fetch", 0) });
    await expect(sendCode("friend@example.com")).resolves.toEqual({ ok: false, problem: "offline" });
  });

  it("reports offline without asking Supabase when the browser is offline", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    await expect(sendCode("friend@example.com")).resolves.toEqual({ ok: false, problem: "offline" });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("reports a failure for any other error", async () => {
    signInWithOtp.mockResolvedValue(apiError(500, "unexpected_failure"));
    await expect(sendCode("friend@example.com")).resolves.toEqual({ ok: false, problem: "failed" });
  });
});

describe("verifyCode", () => {
  it("checks the code as an email OTP for the address", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: null });
    await expect(verifyCode("friend@example.com", "123456")).resolves.toEqual({ ok: true });
    expect(verifyOtp).toHaveBeenCalledWith({ email: "friend@example.com", token: "123456", type: "email" });
  });

  it("reports a wrong or expired code", async () => {
    verifyOtp.mockResolvedValue(apiError(403, "otp_expired"));
    await expect(verifyCode("friend@example.com", "000000")).resolves.toEqual({ ok: false, problem: "wrong-code" });
  });

  it("reports too many tries when Supabase rate-limits", async () => {
    verifyOtp.mockResolvedValue(apiError(429, "over_request_rate_limit"));
    await expect(verifyCode("friend@example.com", "123456")).resolves.toEqual({ ok: false, problem: "rate-limited" });
  });

  it("reports offline when Supabase cannot be reached", async () => {
    verifyOtp.mockResolvedValue({ data: {}, error: new AuthRetryableFetchError("Failed to fetch", 0) });
    await expect(verifyCode("friend@example.com", "123456")).resolves.toEqual({ ok: false, problem: "offline" });
  });

  it("reports a failure when Supabase errors on its side", async () => {
    verifyOtp.mockResolvedValue(apiError(500, "unexpected_failure"));
    await expect(verifyCode("friend@example.com", "123456")).resolves.toEqual({ ok: false, problem: "failed" });
  });
});

describe("toCodeDigits", () => {
  it("keeps only the digits of a pasted code", () => {
    expect(toCodeDigits("Your code: 123 456")).toBe("123456");
  });

  it("keeps the newest six digits when more arrive", () => {
    expect(toCodeDigits("111111222222")).toBe("222222");
  });
});
