import { afterEach, describe, expect, it, vi } from "vitest";
import { markWelcomeSeen, welcomeSeen } from "./welcome";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("welcomeSeen", () => {
  it("is false until the prompt has been seen on this device", () => {
    expect(welcomeSeen()).toBe(false);
    markWelcomeSeen();
    expect(welcomeSeen()).toBe(true);
  });

  it("reads as seen when storage is blocked, so the prompt does not show on every visit", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("blocked", "SecurityError"); });
    expect(() => { markWelcomeSeen(); }).not.toThrow();
    expect(welcomeSeen()).toBe(true);
  });
});
