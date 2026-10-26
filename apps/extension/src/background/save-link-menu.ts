import type { SaveLinkResponse } from "@linkables/shared/links";
import { saveCurrentTab, type SaveOutcome, type SaveRequest } from "../save/save-flow";

export const SAVE_LINK_MENU_ID = "save-link";

// Shown as the toolbar button's tooltip while the badge answers.
export const MENU_HINTS = {
  saved: "Link saved to linkables",
  signedOut: "Sign in first: click the linkables button.",
} as const;

type MenuDeps = {
  save: (request: SaveRequest) => Promise<SaveLinkResponse>;
  signedIn: () => Promise<boolean>;
  // The worker has no page to speak in, so the toolbar badge and tooltip on the clicked tab answer for a moment.
  flash: (tabId: number, ok: boolean, hint: string) => Promise<void>;
};

function hintFor(outcome: SaveOutcome): string {
  if (outcome.status === "saved") return MENU_HINTS.saved;
  return outcome.status === "cant" ? outcome.reason : outcome.message;
}

// The pop-up's save flow, given the right-clicked link's address instead of the tab's.
export async function saveFromMenu(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined, deps: MenuDeps): Promise<void> {
  if (info.menuItemId !== SAVE_LINK_MENU_ID) return;
  const tabId = tab?.id;
  if (!(await deps.signedIn())) {
    if (tabId !== undefined) await deps.flash(tabId, false, MENU_HINTS.signedOut);
    return;
  }
  const outcome = await saveCurrentTab({ readTab: () => Promise.resolve({ url: info.linkUrl }), save: deps.save });
  if (tabId !== undefined) await deps.flash(tabId, outcome.status === "saved", hintFor(outcome));
}
