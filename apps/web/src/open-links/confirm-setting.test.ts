import { afterEach, describe, expect, it, vi } from "vitest";
import { ASK_BEFORE_OPENING_KEY, needsConfirm, useAskBeforeOpening } from "./confirm-setting";

afterEach(() => {
  useAskBeforeOpening.setState({ ask: true });
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("needsConfirm", () => {
  it("never asks for a single link", () => {
    expect(needsConfirm(1, true)).toBe(false);
  });

  it("asks for several links while the setting is on", () => {
    expect(needsConfirm(2, true)).toBe(true);
  });

  it("does not ask for several links once the setting is off", () => {
    expect(needsConfirm(25, false)).toBe(false);
  });

  it("still asks for more than 25 links with the setting off", () => {
    expect(needsConfirm(26, false)).toBe(true);
  });
});

describe("useAskBeforeOpening", () => {
  it("remembers turning it off on this device", () => {
    useAskBeforeOpening.getState().setAsk(false);
    expect(useAskBeforeOpening.getState().ask).toBe(false);
    expect(localStorage.getItem(ASK_BEFORE_OPENING_KEY)).toBe("off");
  });

  it("clears the stored choice when turned back on", () => {
    useAskBeforeOpening.getState().setAsk(false);
    useAskBeforeOpening.getState().setAsk(true);
    expect(localStorage.getItem(ASK_BEFORE_OPENING_KEY)).toBeNull();
  });

  it("still changes for this visit when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    useAskBeforeOpening.getState().setAsk(false);
    expect(useAskBeforeOpening.getState().ask).toBe(false);
  });
});
