import type { Session } from "@supabase/supabase-js";
import { expect, it } from "vitest";
import { showsLanding } from "./show-landing";

const signedOut = { status: "signed-out", linkProblem: null, afterSignOut: false } as const;

it("shows the landing page to a signed-out visitor at /", () => {
  expect(showsLanding(signedOut, "/")).toBe(true);
});

it("never shows the landing page to a signed-in user", () => {
  expect(showsLanding({ status: "signed-in", session: {} as Session }, "/")).toBe(false);
});

it("keeps the landing page off other paths", () => {
  expect(showsLanding(signedOut, "/save")).toBe(false);
});

it("sends someone who just signed out to the sign-in screen instead", () => {
  expect(showsLanding({ ...signedOut, afterSignOut: true }, "/")).toBe(false);
});

it("sends someone with a broken sign-in link to the sign-in screen instead", () => {
  expect(showsLanding({ ...signedOut, linkProblem: "expired" }, "/")).toBe(false);
});
