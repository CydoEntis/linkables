import type { SaveLinkResponse } from "@linkables/shared/links";
import { ApiError } from "@linkables/shared/api-client";
import { describe, expect, it, vi } from "vitest";
import { SAVE_LINK_MENU_ID, saveFromMenu } from "./save-link-menu";

const saved = { id: "6f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f", duplicate: false } as SaveLinkResponse;

function deps(save = vi.fn(() => Promise.resolve(saved))) {
  return { save, flash: vi.fn(() => Promise.resolve()) };
}

describe("saveFromMenu", () => {
  it("saves the right-clicked link's address, marked as saved from the extension", async () => {
    const d = deps();
    await saveFromMenu({ menuItemId: SAVE_LINK_MENU_ID, linkUrl: "https://example.com/linked" }, { id: 7 }, d);
    expect(d.save).toHaveBeenCalledWith({ url: "https://example.com/linked", source: "extension" });
  });

  it("flashes a check on the tab once it is saved", async () => {
    const d = deps();
    await saveFromMenu({ menuItemId: SAVE_LINK_MENU_ID, linkUrl: "https://example.com/linked" }, { id: 7 }, d);
    expect(d.flash).toHaveBeenCalledWith(7, true);
  });

  it("flashes a warning when the save fails", async () => {
    const d = deps(vi.fn(() => Promise.reject(new ApiError("INTERNAL", "Boom"))));
    await saveFromMenu({ menuItemId: SAVE_LINK_MENU_ID, linkUrl: "https://example.com/linked" }, { id: 7 }, d);
    expect(d.flash).toHaveBeenCalledWith(7, false);
  });

  it("does not call the API for a link that can't be saved", async () => {
    const d = deps();
    await saveFromMenu({ menuItemId: SAVE_LINK_MENU_ID, linkUrl: "javascript:void(0)" }, { id: 7 }, d);
    expect(d.save).not.toHaveBeenCalled();
    expect(d.flash).toHaveBeenCalledWith(7, false);
  });

  it("ignores another menu's clicks", async () => {
    const d = deps();
    await saveFromMenu({ menuItemId: "other", linkUrl: "https://example.com/linked" }, { id: 7 }, d);
    expect(d.save).not.toHaveBeenCalled();
  });
});
