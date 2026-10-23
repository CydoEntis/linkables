import { afterEach, describe, expect, it, vi } from "vitest";
import { isVisible } from "./is-visible";

const checkVisibility = Object.getOwnPropertyDescriptor(Element.prototype, "checkVisibility");

afterEach(() => {
  if (checkVisibility) Object.defineProperty(Element.prototype, "checkVisibility", checkVisibility);
});

describe("isVisible", () => {
  it("asks checkVisibility where the browser has it", () => {
    Element.prototype.checkVisibility = () => false;
    expect(isVisible(document.createElement("button"))).toBe(false);
  });

  it("falls back to the element's boxes on browsers without checkVisibility", () => {
    // @ts-expect-error -- Safari before 17.4 has no checkVisibility.
    delete Element.prototype.checkVisibility;
    const shown = document.createElement("button");
    const hidden = document.createElement("button");
    vi.spyOn(shown, "getClientRects").mockReturnValue([new DOMRect()] as unknown as DOMRectList);
    vi.spyOn(hidden, "getClientRects").mockReturnValue([] as unknown as DOMRectList);
    expect(isVisible(shown)).toBe(true);
    expect(isVisible(hidden)).toBe(false);
  });
});
