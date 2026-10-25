import { describe, expect, it } from "vitest";
import { signInMethod } from "./sign-in-method";

describe("signInMethod", () => {
  it("names Google for a Google account", () => {
    expect(signInMethod({ app_metadata: { provider: "google" } })).toBe("Signed in with Google");
  });

  it("names the email code for an email account", () => {
    expect(signInMethod({ app_metadata: { provider: "email" } })).toBe("Signed in with an email code");
  });

  it("says nothing for a provider it doesn't know", () => {
    expect(signInMethod({ app_metadata: {} })).toBeUndefined();
  });
});
