import { describe, expect, it } from "vitest";
import { shortcutLabel } from "./shortcut";

describe("shortcutLabel", () => {
  it("shows the key the user has now", () => {
    expect(shortcutLabel([{ name: "_execute_action" }, { name: "open-side-panel", shortcut: "Ctrl+Shift+K" }], "open-side-panel")).toBe("Ctrl+Shift+K");
  });

  it("says Not set when Chrome gave the key to something else", () => {
    expect(shortcutLabel([{ name: "open-side-panel", shortcut: "" }], "open-side-panel")).toBe("Not set");
  });

  it("says Not set when the command is missing", () => {
    expect(shortcutLabel([], "open-side-panel")).toBe("Not set");
  });
});
