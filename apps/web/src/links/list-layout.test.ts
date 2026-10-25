import { afterEach, describe, expect, it } from "vitest";
import { LIST_LAYOUT_KEY, resolveLayout, useLayoutChoice } from "./list-layout";

afterEach(() => {
  useLayoutChoice.setState({ choice: null });
  localStorage.clear();
});

describe("resolveLayout", () => {
  it("opens big screens on the grid and smaller computers on the list", () => {
    expect(resolveLayout(null, { wide: true, big: true })).toBe("grid");
    expect(resolveLayout(null, { wide: true, big: false })).toBe("list");
  });

  it("follows the device's own choice on any computer", () => {
    expect(resolveLayout("list", { wide: true, big: true })).toBe("list");
    expect(resolveLayout("grid", { wide: true, big: false })).toBe("grid");
  });

  it("always shows phones the list", () => {
    expect(resolveLayout("grid", { wide: false, big: false })).toBe("list");
  });
});

describe("choosing a layout", () => {
  it("is remembered on this device", () => {
    useLayoutChoice.getState().choose("grid");
    expect(useLayoutChoice.getState().choice).toBe("grid");
    expect(localStorage.getItem(LIST_LAYOUT_KEY)).toBe("grid");
  });
});
