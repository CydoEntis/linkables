import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isAutoConnectPaused, pauseAutoConnect } from "../connect/auto-connect";
import { memoryStorageArea } from "../test/memory-storage-area";
import { signInWithGoogle } from "./worker-sign-in";

const auth = vi.hoisted(() => ({ signInWithOAuth: vi.fn(), exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() }));
vi.mock("./create-supabase", () => ({ AUTH_STORAGE_KEY: "sb-test-auth-token", createSupabase: () => ({ auth }) }));

const REDIRECT = "https://ekgbmopoceccloaibfknnbnohkpbkili.chromiumapp.org/";
const launchWebAuthFlow = vi.fn<(details: { url: string; interactive: boolean }) => Promise<string | undefined>>();
let local: chrome.storage.StorageArea;

beforeEach(async () => {
  local = memoryStorageArea();
  vi.stubGlobal("chrome", { storage: { local, session: memoryStorageArea() }, identity: { getRedirectURL: () => REDIRECT, launchWebAuthFlow } });
  await pauseAutoConnect(local);
  auth.signInWithOAuth.mockReset().mockResolvedValue({ data: { url: "https://supabase.test/authorize" }, error: null });
  auth.exchangeCodeForSession.mockReset().mockResolvedValue({ data: {}, error: null });
  launchWebAuthFlow.mockReset().mockResolvedValue(`${REDIRECT}?code=abc`);
});

afterEach(() => { vi.unstubAllGlobals(); });

describe("signInWithGoogle", () => {
  it("exchanges the returned code for a session and resumes the sign-in from linkables.app", async () => {
    await expect(signInWithGoogle()).resolves.toEqual({ ok: true });

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { redirectTo: REDIRECT, skipBrowserRedirect: true } });
    expect(launchWebAuthFlow).toHaveBeenCalledWith({ url: "https://supabase.test/authorize", interactive: true });
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    await expect(isAutoConnectPaused(local)).resolves.toBe(false);
  });

  it("reports the user closing the Google window as cancelled", async () => {
    launchWebAuthFlow.mockRejectedValue(new Error("The user did not approve access."));

    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, problem: "cancelled" });
  });

  it("reports any other failure to open the Google window as failed", async () => {
    launchWebAuthFlow.mockRejectedValue(new Error("Authorization page could not be loaded."));

    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, problem: "failed" });
  });

  it("reports Google's access_denied as cancelled", async () => {
    launchWebAuthFlow.mockResolvedValue(`${REDIRECT}?error=access_denied`);

    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, problem: "cancelled" });
  });

  it("stays paused when the code cannot be exchanged", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: new Error("bad code") });

    await expect(signInWithGoogle()).resolves.toEqual({ ok: false, problem: "failed" });
    await expect(isAutoConnectPaused(local)).resolves.toBe(true);
  });
});
