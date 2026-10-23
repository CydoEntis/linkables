import { afterEach, describe, expect, it, vi } from "vitest";
import { clampWidth, PANEL_WIDTH, readStoredWidth, storeWidth, widthAfterKey } from "./panel-width";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("panel width", () => {
  it("keeps the width between 360 and 900 px", () => {
    expect(clampWidth(200)).toBe(PANEL_WIDTH.min);
    expect(clampWidth(1200)).toBe(PANEL_WIDTH.max);
    expect(clampWidth(512)).toBe(512);
  });

  it("widens with the left arrow and narrows with the right, since the grip is on the panel's left edge", () => {
    expect(widthAfterKey(480, "ArrowLeft")).toBe(496);
    expect(widthAfterKey(480, "ArrowRight")).toBe(464);
  });

  it("jumps to the limits with Home and End, and stops at them", () => {
    expect(widthAfterKey(480, "Home")).toBe(PANEL_WIDTH.min);
    expect(widthAfterKey(480, "End")).toBe(PANEL_WIDTH.max);
    expect(widthAfterKey(895, "ArrowLeft")).toBe(PANEL_WIDTH.max);
  });

  it("ignores other keys", () => {
    expect(widthAfterKey(480, "Enter")).toBeNull();
  });

  it("remembers the width", () => {
    storeWidth(640);
    expect(readStoredWidth()).toBe(640);
  });

  it("starts at 480 px when nothing usable is stored", () => {
    expect(readStoredWidth()).toBe(PANEL_WIDTH.default);
    localStorage.setItem("linkables.detailsWidth", "wide");
    expect(readStoredWidth()).toBe(PANEL_WIDTH.default);
    localStorage.setItem("linkables.detailsWidth", "5000");
    expect(readStoredWidth()).toBe(PANEL_WIDTH.max);
  });

  it("still works when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(() => { storeWidth(600); }).not.toThrow();
    expect(readStoredWidth()).toBe(PANEL_WIDTH.default);
  });
});
