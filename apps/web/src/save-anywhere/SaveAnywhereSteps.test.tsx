import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SaveAnywhereSteps } from "./SaveAnywhereSteps";

const SHORTCUT = "https://www.icloud.com/shortcuts/abc123";

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

  it("leads iPhone with the shortcut link, the three-step guide and the Safari sign-in note", () => {
    render(<SaveAnywhereSteps device="iphone" shortcutUrl={SHORTCUT} />);
    expect(leadCard()).toHaveAccessibleName("On iPhone or iPad");
    expect(screen.getByRole("link", { name: "Add the shortcut" })).toHaveAttribute("href", SHORTCUT);
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      expect.stringContaining("1. Get the shortcut"),
      expect.stringContaining("2. Add shortcut"),
      expect.stringContaining("3. Use it from Share"),
    ]);
    expect(screen.getByText(/sign in to linkables in Safari/)).toBeVisible();
  });

  it("says the iPhone shortcut is coming soon, with no button, when it has no link yet", () => {
    render(<SaveAnywhereSteps device="iphone" shortcutUrl={undefined} />);
    expect(screen.getByText("The iPhone shortcut is coming soon.")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Add the shortcut" })).toBeNull();
  });

  it("leads a computer with the bookmark button and dragging a link onto the window", () => {
    render(<SaveAnywhereSteps device="desktop" shortcutUrl={SHORTCUT} />);
    expect(leadCard()).toHaveAccessibleName("On a computer");
    expect(screen.getByRole("link", { name: "Save to linkables" })).toHaveAttribute("href", expect.stringMatching(/^javascript:/));
    expect(screen.getByText("Or drag any link onto your links list.")).toBeVisible();
  });

  it("keeps the other devices behind See other ways", async () => {
    render(<SaveAnywhereSteps device="desktop" shortcutUrl={SHORTCUT} />);
    expect(screen.getByRole("region", { name: "On Android" })).not.toBeVisible();

    await userEvent.click(screen.getByText("See other ways"));

    expect(screen.getByRole("region", { name: "On Android" })).toBeVisible();
    expect(screen.getByRole("region", { name: "On iPhone or iPad" })).toBeVisible();
  });
});
