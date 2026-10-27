import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { ExtensionGuidePage } from "./ExtensionGuidePage";

// The page treats an empty store address as "not listed", the by-hand install.
const NOT_LISTED = "";

it("offers the extension zip from its stable download address when it isn't in the Web Store", async () => {
  await renderWithRouter(<ExtensionGuidePage storeUrl={NOT_LISTED} />);
  expect(screen.getByRole("link", { name: "Download for Chrome" })).toHaveAttribute("href", "/downloads/linkables-chrome.zip");
});

it("walks through loading the unzipped folder in Chrome when it isn't in the Web Store", async () => {
  await renderWithRouter(<ExtensionGuidePage storeUrl={NOT_LISTED} />);
  const steps = screen.getAllByRole("listitem").map((step) => step.textContent);
  expect(steps).toEqual([
    expect.stringContaining("Download"),
    expect.stringContaining("Unzip"),
    expect.stringContaining("chrome://extensions"),
    expect.stringContaining("Developer mode"),
    expect.stringContaining("Load unpacked"),
    expect.stringContaining("Pin"),
    expect.stringContaining("Sign in"),
  ]);
});

const STORE_URL = "https://chromewebstore.google.com/detail/linkables/abcdefghijklmnopabcdefghijklmnop";

it("offers Add to Chrome from the Web Store once the extension is listed there", async () => {
  await renderWithRouter(<ExtensionGuidePage storeUrl={STORE_URL} />);
  expect(screen.getByRole("link", { name: "Add to Chrome" })).toHaveAttribute("href", STORE_URL);
  expect(screen.queryByRole("link", { name: "Download for Chrome" })).not.toBeInTheDocument();
});

it("skips the by-hand steps when the extension comes from the Web Store", async () => {
  await renderWithRouter(<ExtensionGuidePage storeUrl={STORE_URL} />);
  const steps = screen.getAllByRole("listitem").map((step) => step.textContent);
  expect(steps).toEqual([expect.stringContaining("Add linkables"), expect.stringContaining("Pin"), expect.stringContaining("Sign in")]);
});

it("offers Add to Firefox, installed from the signed add-on, to a Firefox visitor", async () => {
  await renderWithRouter(<ExtensionGuidePage storeUrl={STORE_URL} firefox />);
  expect(screen.getByRole("heading", { level: 1, name: "linkables for Firefox" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Add to Firefox" })).toHaveAttribute("href", "/downloads/linkables-firefox.xpi");
  expect(screen.queryByRole("link", { name: "Add to Chrome" })).not.toBeInTheDocument();
});
