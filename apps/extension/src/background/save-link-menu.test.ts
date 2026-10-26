import type { SaveLinkResponse } from "@linkables/shared/links";
import { ApiError } from "@linkables/shared/api-client";
import { describe, expect, it, vi } from "vitest";
import { NO_SESSION } from "../api/client";
import { SAVE_MESSAGES } from "../save/save-flow";
import { MENU_HINTS, SAVE_LINK_MENU_ID, saveFromMenu } from "./save-link-menu";

const saved = { id: "6f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f", duplicate: false } as SaveLinkResponse;

function deps({ save = vi.fn(() => Promise.resolve(saved)), signedIn = true } = {}) {
  return { save, signedIn: () => Promise.resolve(signedIn), flash: vi.fn(() => Promise.resolve()) };
}

const click = (linkUrl: string, menuItemId: string = SAVE_LINK_MENU_ID) => ({ menuItemId, linkUrl });

describe("saveFromMenu", () => {
  it("saves the right-clicked link's address, marked as saved from the extension", async () => {
    const d = deps();
    await saveFromMenu(click("https://example.com/linked"), { id: 7 }, d);
    expect(d.save).toHaveBeenCalledWith({ url: "https://example.com/linked", source: "extension" });
  });

  it("flashes a check on the tab once it is saved", async () => {
    const d = deps();
    await saveFromMenu(click("https://example.com/linked"), { id: 7 }, d);
    expect(d.flash).toHaveBeenCalledWith(7, true, MENU_HINTS.saved);
  });

  it("flashes a warning with the reason when the save fails", async () => {
    const d = deps({ save: vi.fn(() => Promise.reject(new ApiError("INTERNAL", "Boom"))) });
    await saveFromMenu(click("https://example.com/linked"), { id: 7 }, d);
    expect(d.flash).toHaveBeenCalledWith(7, false, SAVE_MESSAGES.failed);
  });

  it("tells a signed-out user to sign in, without calling the API", async () => {
    const d = deps({ signedIn: false });
    await saveFromMenu(click("https://example.com/linked"), { id: 7 }, d);
    expect(d.save).not.toHaveBeenCalled();
    expect(d.flash).toHaveBeenCalledWith(7, false, MENU_HINTS.signedOut);
  });

  it("asks to open linkables when the stored sign-in needs a refresh the worker won't make", async () => {
    const d = deps({ save: vi.fn(() => Promise.reject(new ApiError(NO_SESSION, "No session to send"))) });
    await saveFromMenu(click("https://example.com/linked"), { id: 7 }, d);
    expect(d.flash).toHaveBeenCalledWith(7, false, MENU_HINTS.refresh);
  });

  it("tells the user to sign in when the API turns the stored sign-in away", async () => {
    const d = deps({ save: vi.fn(() => Promise.reject(new ApiError("UNAUTHENTICATED", "Invalid token"))) });
    await saveFromMenu(click("https://example.com/linked"), { id: 7 }, d);
    expect(d.flash).toHaveBeenCalledWith(7, false, MENU_HINTS.signedOut);
  });

  it("does not call the API for a link that can't be saved", async () => {
    const d = deps();
    await saveFromMenu(click("javascript:void(0)"), { id: 7 }, d);
    expect(d.save).not.toHaveBeenCalled();
    expect(d.flash).toHaveBeenCalledWith(7, false, expect.any(String));
  });

  it("ignores another menu's clicks", async () => {
    const d = deps();
    await saveFromMenu(click("https://example.com/linked", "other"), { id: 7 }, d);
    expect(d.save).not.toHaveBeenCalled();
  });
});
