import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SaveAnywhereSteps } from "./SaveAnywhereSteps";

const SHORTCUT = "https://www.icloud.com/shortcuts/abc123";

afterEach(() => {
  vi.restoreAllMocks();
});

function leadCard() {
  const [lead] = screen.getAllByRole("region");
  if (!lead) throw new Error("no lead card");
  return lead;
}

describe("SaveAnywhereSteps", () => {
  it("leads Android with adding linkables to the home screen, then Share", () => {
    render(<SaveAnywhereSteps device="android" shortcutUrl={SHORTCUT} />);
    expect(leadCard()).toHaveAccessibleName("On Android");
    expect(screen.getByText("Add linkables to your home screen")).toBeVisible();
    expect(screen.getByText(/Then in any app, tap Share/)).toBeVisible();
  });

  it("offers Install on Android once the browser allows it", async () => {
    render(<SaveAnywhereSteps device="android" shortcutUrl={undefined} />);
    expect(screen.queryByRole("button", { name: "Install linkables" })).toBeNull();

    const prompt = vi.fn(() => Promise.resolve());
    act(() => { window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt })); });
    await userEvent.click(screen.getByRole("button", { name: "Install linkables" }));

    expect(prompt).toHaveBeenCalledOnce();
    await vi.waitFor(() => { expect(screen.queryByRole("button", { name: "Install linkables" })).toBeNull(); });
  });

  it("shows only the plain steps on the Android card of another device, even where this browser could install", async () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    render(<SaveAnywhereSteps device="desktop" shortcutUrl={SHORTCUT} />);
    act(() => { window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), { prompt: vi.fn() })); });
    await userEvent.click(screen.getByText("See other ways"));

    const android = screen.getByRole("region", { name: "On Android" });
    expect(within(android).getByText("Add linkables to your home screen")).toBeVisible();
    expect(within(android).queryByRole("button", { name: "Install linkables" })).toBeNull();
  });

  it("offers manual setup first and keeps an optional iCloud shortcut behind a disclosure", async () => {
    render(<SaveAnywhereSteps device="iphone" shortcutUrl={SHORTCUT} />);
    expect(leadCard()).toHaveAccessibleName("On iPhone or iPad");
    expect(screen.getByText("Create a shortcut for this server")).toBeVisible();
    expect(screen.getByRole("list", { name: "Create the iPhone shortcut" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Add the shortcut" })).not.toBeVisible();
    await userEvent.click(screen.getByText("Use an existing iCloud shortcut"));
    expect(screen.getByRole("link", { name: "Add the shortcut" })).toHaveAttribute("href", SHORTCUT);
    expect(screen.getByText(/default browser \(usually Safari\), so sign in to linkables there once/)).toBeVisible();
  });

  it("provides complete current-origin iPhone setup without a configured iCloud link", () => {
    render(<SaveAnywhereSteps device="iphone" shortcutUrl={undefined} />);
    const guide = screen.getByRole("list", { name: "Create the iPhone shortcut" });
    expect(guide).toHaveTextContent("Show in Share Sheet");
    expect(guide).toHaveTextContent("URL Encode");
    expect(guide).toHaveTextContent("Open URLs");
    expect(within(guide).getByText(`${window.location.origin}/save?url=`)).toBeVisible();
    expect(screen.queryByText(/coming soon/i)).toBeNull();
    expect(screen.queryByRole("link", { name: "Add the shortcut" })).toBeNull();
    expect(screen.getByText(/Add to Home Screen/)).toBeVisible();
  });

  it("leads a computer with the bookmark button and dragging a link onto the window", () => {
    render(<SaveAnywhereSteps device="desktop" shortcutUrl={SHORTCUT} />);
    expect(leadCard()).toHaveAccessibleName("On a computer");
    expect(screen.getByRole("link", { name: "Save to linkables" })).toHaveAttribute("href", expect.stringMatching(/^javascript:/));
    expect(screen.getByText("Or drag any link onto your links list.")).toBeVisible();
  });

  it("points a computer to the Chrome extension guide", () => {
    render(<SaveAnywhereSteps device="desktop" shortcutUrl={SHORTCUT} />);
    expect(screen.getByRole("link", { name: "Use Chrome? Try the linkables extension (beta)" })).toHaveAttribute("href", "/extension");
  });

  it("keeps the other devices behind See other ways", async () => {
    render(<SaveAnywhereSteps device="desktop" shortcutUrl={SHORTCUT} />);
    expect(screen.getByRole("region", { name: "On Android" })).not.toBeVisible();

    await userEvent.click(screen.getByText("See other ways"));

    expect(screen.getByRole("region", { name: "On Android" })).toBeVisible();
    expect(screen.getByRole("region", { name: "On iPhone or iPad" })).toBeVisible();
  });
});
