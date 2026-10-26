import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { EXTENSION_CARD_DISMISSED_KEY } from "./extension-card";
import { ExtensionCard } from "./ExtensionCard";
import { CHROME_WEB_STORE_URL } from "./path";

beforeEach(() => {
  localStorage.clear();
});

// The card remembers a dismissal for the rest of the visit too, so the test that dismisses it runs last.
describe("ExtensionCard", () => {
  it("offers the extension from the Chrome Web Store", async () => {
    await renderWithRouter(<ExtensionCard />);
    expect(screen.getByRole("region", { name: "Chrome extension" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Add to Chrome/ })).toHaveAttribute("href", CHROME_WEB_STORE_URL);
  });

  it("stays dismissed on this device once dismissed", async () => {
    const user = userEvent.setup();
    const { unmount } = await renderWithRouter(<ExtensionCard />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("region", { name: "Chrome extension" })).not.toBeInTheDocument();
    expect(localStorage.getItem(EXTENSION_CARD_DISMISSED_KEY)).not.toBeNull();
    unmount();
    await renderWithRouter(<ExtensionCard />);
    expect(screen.queryByRole("region", { name: "Chrome extension" })).not.toBeInTheDocument();
  });
});
