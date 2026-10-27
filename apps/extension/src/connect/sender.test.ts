import { describe, expect, it } from "vitest";
import { isAllowedSender } from "./sender";

const where = { extensionId: "abc", extensionPagesUrl: "moz-extension://uuid-1/", appOrigin: "https://linkables.app" };
const handoff = { type: "wants-session", explicit: false } as const;
const google = { type: "sign-in-with-google" } as const;

describe("isAllowedSender", () => {
  it("lets the content script on the app's pages ask for the hand-off", () => {
    expect(isAllowedSender(handoff, { id: "abc", url: "https://linkables.app/extension/connect" }, where)).toBe(true);
  });

  it("refuses the hand-off from any other page, even a look-alike host", () => {
    expect(isAllowedSender(handoff, { id: "abc", url: "https://linkables.app.evil.test/" }, where)).toBe(false);
    expect(isAllowedSender(handoff, { id: "abc", url: "http://linkables.app/" }, where)).toBe(false);
  });

  it("lets only the extension's own pages start Google sign-in", () => {
    expect(isAllowedSender(google, { id: "abc", url: "moz-extension://uuid-1/popup.html" }, where)).toBe(true);
    expect(isAllowedSender(google, { id: "abc", url: "https://linkables.app/" }, where)).toBe(false);
  });

  it("refuses another extension and a sender without an address", () => {
    expect(isAllowedSender(handoff, { id: "other", url: "https://linkables.app/" }, where)).toBe(false);
    expect(isAllowedSender(handoff, { id: "abc" }, where)).toBe(false);
  });
});
