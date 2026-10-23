import { fireEvent, render, screen } from "@testing-library/react";
import { createPortal } from "react-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { wrapTab } from "./wrap-tab";

beforeEach(() => {
  vi.spyOn(Element.prototype, "checkVisibility").mockImplementation(function (this: Element) {
    return this.closest("[hidden]") === null;
  });
});

function renderPopup(extra?: React.ReactNode) {
  render(
    <div role="dialog" onKeyDown={wrapTab}>
      <button type="button">First</button>
      <button type="button">Middle</button>
      <button type="button">Last</button>
      {extra}
    </div>,
  );
}

function tab(shiftKey = false) {
  const active = document.activeElement ?? document.body;
  return fireEvent.keyDown(active, { key: "Tab", shiftKey });
}

describe("wrapTab", () => {
  it("moves Tab on the last item to the first", () => {
    renderPopup();
    screen.getByRole("button", { name: "Last" }).focus();
    expect(tab()).toBe(false);
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("moves Shift+Tab on the first item to the last", () => {
    renderPopup();
    screen.getByRole("button", { name: "First" }).focus();
    expect(tab(true)).toBe(false);
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  });

  it("moves Shift+Tab on the popup itself to the last item", () => {
    renderPopup();
    const popup = screen.getByRole("dialog");
    popup.tabIndex = -1;
    popup.focus();
    expect(tab(true)).toBe(false);
    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  });

  it("leaves Tab between inner items to the browser", () => {
    renderPopup();
    screen.getByRole("button", { name: "First" }).focus();
    expect(tab()).toBe(true);
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("skips hidden, disabled, untabbable and focus-guard elements when finding the edges", () => {
    renderPopup(
      <>
        <button type="button" disabled>Disabled</button>
        <div hidden><button type="button">Hidden</button></div>
        <span tabIndex={0} data-base-ui-focus-guard="" />
        <input tabIndex={-1} aria-hidden="true" />
      </>,
    );
    screen.getByRole("button", { name: "Last" }).focus();
    expect(tab()).toBe(false);
    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("leaves Tab inside a portalled popover to the popover", () => {
    renderPopup(createPortal(<button type="button">In popover</button>, document.body));
    screen.getByRole("button", { name: "In popover" }).focus();
    expect(tab()).toBe(true);
    expect(screen.getByRole("button", { name: "In popover" })).toHaveFocus();
  });
});
