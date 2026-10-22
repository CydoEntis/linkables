import { AuthImplicitGrantRedirectError } from "@supabase/supabase-js";
import { expect, it, vi } from "vitest";
import { readLinkProblem } from "./link-landing";

const initialize = vi.hoisted(() => vi.fn());
vi.mock("./supabase", () => ({ supabase: { auth: { initialize } } }));

it("reports an expired link and strips only the hash from the URL", async () => {
  window.history.replaceState(null, "", "/inbox?from=mail#error=access_denied&error_code=otp_expired");
  initialize.mockResolvedValue({
    error: new AuthImplicitGrantRedirectError("Email link is invalid or has expired", {
      error: "access_denied",
      code: "otp_expired",
    }),
  });
  await expect(readLinkProblem()).resolves.toBe("expired");
  expect(window.location.pathname + window.location.search + window.location.hash).toBe("/inbox?from=mail");
});
