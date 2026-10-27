import type { SaveLinkResponse } from "@linkables/shared/links";
import { ApiError } from "@linkables/shared/api-client";
import { describe, expect, it, vi } from "vitest";
import { MENU_HINTS } from "./save-link-menu";
import { QUIET_SAVE_COMMAND, saveQuietly } from "./quiet-save";

const saved = { id: "6f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f", duplicate: false } as SaveLinkResponse;
const tab = { id: 7, url: "https://example.com/read", title: "Read me" };

function deps({ save = vi.fn(() => Promise.resolve(saved)), signedIn = true } = {}) {
  return { save, signedIn: () => Promise.resolve(signedIn), flash: vi.fn(() => Promise.resolve()) };
}

describe("saveQuietly", () => {
  it("saves the current tab's address, marked as saved from the extension", async () => {
    const d = deps();
    await saveQuietly(QUIET_SAVE_COMMAND, tab, d);
    expect(d.save).toHaveBeenCalledWith({ url: "https://example.com/read", source: "extension" });
  });

  it("flashes a check on the tab once it is saved", async () => {
    const d = deps();
    await saveQuietly(QUIET_SAVE_COMMAND, tab, d);
    expect(d.flash).toHaveBeenCalledWith(7, true, MENU_HINTS.saved);
  });

  it("flashes a warning with the reason when the save fails", async () => {
    const d = deps({ save: vi.fn(() => Promise.reject(new ApiError("RATE_LIMIT", "Slow down"))) });
    await saveQuietly(QUIET_SAVE_COMMAND, tab, d);
    expect(d.flash).toHaveBeenCalledWith(7, false, expect.stringContaining("fast"));
  });

  it("tells a signed-out user to sign in, without calling the API", async () => {
    const d = deps({ signedIn: false });
    await saveQuietly(QUIET_SAVE_COMMAND, tab, d);
    expect(d.save).not.toHaveBeenCalled();
    expect(d.flash).toHaveBeenCalledWith(7, false, MENU_HINTS.signedOut);
  });

  it("does not call the API for a page that can't be saved", async () => {
    const d = deps();
    await saveQuietly(QUIET_SAVE_COMMAND, { id: 7, url: "chrome://settings" }, d);
    expect(d.save).not.toHaveBeenCalled();
    expect(d.flash).toHaveBeenCalledWith(7, false, expect.any(String));
  });

  it("ignores another command", async () => {
    const d = deps();
    await saveQuietly("open-side-panel", tab, d);
    expect(d.save).not.toHaveBeenCalled();
    expect(d.flash).not.toHaveBeenCalled();
  });

  it("does nothing without a tab to mark", async () => {
    const d = deps();
    await saveQuietly(QUIET_SAVE_COMMAND, undefined, d);
    expect(d.save).not.toHaveBeenCalled();
  });
});
