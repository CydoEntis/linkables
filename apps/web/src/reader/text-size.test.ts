import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TEXT_SIZE, readTextSize, storeTextSize } from "./text-size";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("reader text size", () => {
  it("starts at the middle size", () => {
    expect(readTextSize()).toBe(DEFAULT_TEXT_SIZE);
    expect(DEFAULT_TEXT_SIZE).toBe(1);
  });

  it("remembers the chosen size", () => {
    storeTextSize(2);
    expect(readTextSize()).toBe(2);
    storeTextSize(0);
    expect(readTextSize()).toBe(0);
  });

  it("ignores a stored value that is not one of the sizes", () => {
    for (const stored of ["3", "-1", "1.5", "large", ""]) {
      localStorage.setItem("linkables.readerTextSize", stored);
      expect(readTextSize()).toBe(DEFAULT_TEXT_SIZE);
    }
  });

  it("still works when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(() => { storeTextSize(2); }).not.toThrow();
    expect(readTextSize()).toBe(DEFAULT_TEXT_SIZE);
  });
});
