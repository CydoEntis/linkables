import { AuthImplicitGrantRedirectError } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { readLinkProblem } from "./link-landing";

const initialize = vi.hoisted(() => vi.fn());
vi.mock("./supabase", () => ({ supabase: { auth: { initialize } } }));

function failWith(error: string, code?: string) {
  initialize.mockResolvedValue({
    error: new AuthImplicitGrantRedirectError("Sign-in failed", { error, code: code ?? "unspecified_code" }),
  });
}

function currentUrl() {
  return window.location.pathname + window.location.search + window.location.hash;
}

it("reports an expired link and strips only the hash from the URL", async () => {
  window.history.replaceState(null, "", "/inbox?from=mail#error=access_denied&error_code=otp_expired");
  failWith("access_denied", "otp_expired");
  await expect(readLinkProblem()).resolves.toBe("expired");
  expect(currentUrl()).toBe("/inbox?from=mail");
});

it("reports a cancelled Google sign-in that comes back to the sign-in page", async () => {
  window.history.replaceState(null, "", "/sign-in#error=access_denied&error_description=Cancelled");
  failWith("access_denied");
  await expect(readLinkProblem()).resolves.toBe("google-failed");
});

it("strips a Google error from the query and keeps the other parameters", async () => {
  window.history.replaceState(null, "", "/sign-in?keep=1&error=server_error&error_code=bad_oauth_state&error_description=x");
  failWith("server_error", "bad_oauth_state");
  await readLinkProblem();
  expect(currentUrl()).toBe("/sign-in?keep=1");
});

it("reports a Google failure that Supabase sends to the app root", async () => {
  window.history.replaceState(null, "", "/?error=server_error&error_code=bad_oauth_state&error_description=x");
  failWith("server_error", "bad_oauth_state");
  await expect(readLinkProblem()).resolves.toBe("google-failed");
});
