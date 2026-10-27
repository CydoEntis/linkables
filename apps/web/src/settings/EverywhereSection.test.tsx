import { screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { EverywhereSection } from "./EverywhereSection";

const STORE_URL = "https://chromewebstore.google.com/detail/linkables/abc";

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

it("offers the Firefox add-on on its tile to a Firefox visitor", async () => {
  await renderWithRouter(<EverywhereSection storeUrl={STORE_URL} firefox />);
  const tile = screen.getByRole("heading", { name: "Firefox extension" }).parentElement as HTMLElement;
  expect(within(tile).getByRole("link", { name: "Add to Firefox" })).toHaveAttribute("href", "/downloads/linkables-firefox.xpi");
  expect(screen.queryByRole("link", { name: /Add to Chrome/ })).not.toBeInTheDocument();
});

it("offers the Chrome Web Store listing on its tile to everyone else", async () => {
  await renderWithRouter(<EverywhereSection storeUrl={STORE_URL} firefox={false} />);
  expect(screen.getByRole("heading", { name: "Chrome extension" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Add to Chrome/ })).toHaveAttribute("href", STORE_URL);
});
