import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithRouter } from "../test/render-with-router";
import { ExtensionGuidePage } from "./ExtensionGuidePage";

it("offers the extension zip from its stable download address", async () => {
  await renderWithRouter(<ExtensionGuidePage />);
  expect(screen.getByRole("link", { name: "Download for Chrome" })).toHaveAttribute("href", "/downloads/linkables-chrome.zip");
});

it("walks through loading the unzipped folder in Chrome", async () => {
  await renderWithRouter(<ExtensionGuidePage />);
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
