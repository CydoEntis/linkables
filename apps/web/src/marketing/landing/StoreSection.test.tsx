import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { EXTENSION_GUIDE_PATH } from "../../extension-guide/path";
import { SAVE_ANYWHERE_PATH } from "../../save-anywhere/SaveAnywherePage";
import { StoreSection } from "./StoreSection";
import { storeCards } from "./stores";

const SHORTCUT = "https://www.icloud.com/shortcuts/abc";

function card(name: string) {
  return screen.getByRole("heading", { name, level: 3 }).closest("article") as HTMLElement;
}

it("marks a platform with somewhere to go as available, with its action", () => {
  render(<StoreSection cards={storeCards(SHORTCUT, true)} />);
  const iphone = within(card("iPhone & iPad"));
  expect(iphone.getByText("Available now")).toBeInTheDocument();
  expect(iphone.getByRole("link", { name: "Add the shortcut" })).toHaveAttribute("href", SHORTCUT);
});

it("offers the Chrome extension beta through its install guide", () => {
  render(<StoreSection cards={storeCards(SHORTCUT, true)} />);
  const chrome = within(card("Chrome extension"));
  expect(chrome.getByText("Available now")).toBeInTheDocument();
  expect(chrome.getByText(/beta/)).toBeInTheDocument();
  expect(chrome.getByRole("link", { name: "Get the extension" })).toHaveAttribute("href", EXTENSION_GUIDE_PATH);
});

it("sends iPhone visitors to the in-app guide while the shortcut link is unset", () => {
  render(<StoreSection cards={storeCards(undefined, true)} />);
  expect(within(card("iPhone & iPad")).getByRole("link", { name: "Add the shortcut" })).toHaveAttribute("href", SAVE_ANYWHERE_PATH);
});

it("sends Android and invited web visitors to sign in during the private beta", () => {
  render(<StoreSection cards={storeCards(SHORTCUT, true)} />);
  expect(within(card("Android")).getByRole("link", { name: "Install the app" })).toHaveAttribute("href", "/sign-in");
  expect(within(card("Web app")).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
});

it("offers the web app to everyone once sign-up is open", () => {
  render(<StoreSection cards={storeCards(SHORTCUT, false)} />);
  expect(within(card("Web app")).getByRole("link", { name: "Open the web app" })).toHaveAttribute("href", "/sign-in");
});
