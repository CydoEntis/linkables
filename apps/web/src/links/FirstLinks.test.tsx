import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { FirstLinks } from "./FirstLinks";
import { useLinksUi } from "./links-ui-store";

const plainMatchMedia = window.matchMedia.bind(window);

function onDesktop() {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(min-width: 48rem)",
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

afterEach(() => {
  vi.stubGlobal("matchMedia", plainMatchMedia);
  useLinksUi.getState().setSaveSheetOpen(false);
});

describe("FirstLinks on a computer", () => {
  it("offers the Chrome extension as the main way in", async () => {
    onDesktop();
    await renderWithRouter(<FirstLinks />);
    expect(screen.getByRole("heading", { name: "Save your first link" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add to Chrome" })).toHaveAttribute("href", "/extension");
    expect(screen.getByRole("link", { name: "Set up your phone" })).toHaveAttribute("href", "/save-from-anywhere");
  });

  it("takes Paste a link to the save bar", async () => {
    onDesktop();
    await renderWithRouter(
      <>
        <form role="search">
          <input aria-label="Search or paste a link" data-save-field />
        </form>
        <FirstLinks />
      </>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Paste a link" }));
    expect(screen.getByRole("textbox", { name: "Search or paste a link" })).toHaveFocus();
  });
});

describe("FirstLinks on a phone", () => {
  it("leads with Add to Home Screen, which shows the phone's steps when the browser has no install dialog", async () => {
    await renderWithRouter(<FirstLinks />);
    expect(screen.getByRole("link", { name: "Add to Home Screen" })).toHaveAttribute("href", "/save-from-anywhere");
  });

  it("opens the save sheet from Paste a link", async () => {
    await renderWithRouter(<FirstLinks />);
    await userEvent.click(screen.getByRole("button", { name: "Paste a link" }));
    expect(useLinksUi.getState().saveSheetOpen).toBe(true);
  });

  it("emails the extension's address for later on a computer", async () => {
    await renderWithRouter(<FirstLinks />);
    const email = screen.getByRole("link", { name: "Email me the link" }).getAttribute("href") ?? "";
    expect(email).toMatch(/^mailto:\?subject=/);
    expect(decodeURIComponent(email)).toContain(`${window.location.origin}/extension`);
  });
});
