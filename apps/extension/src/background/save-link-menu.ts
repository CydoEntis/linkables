import { saveCurrentTab, type SaveRequest } from "../save/save-flow";
import type { SaveLinkResponse } from "@linkables/shared/links";

export const SAVE_LINK_MENU_ID = "save-link";

type MenuDeps = {
  save: (request: SaveRequest) => Promise<SaveLinkResponse>;
  // The worker has no page to speak in, so the toolbar badge on the clicked tab answers for a moment.
  flash: (tabId: number, ok: boolean) => Promise<void>;
};

// The pop-up's save flow, given the right-clicked link's address instead of the tab's.
export async function saveFromMenu(info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined, deps: MenuDeps): Promise<void> {
  if (info.menuItemId !== SAVE_LINK_MENU_ID) return;
  const outcome = await saveCurrentTab({ readTab: () => Promise.resolve({ url: info.linkUrl }), save: deps.save });
  if (tab?.id !== undefined) await deps.flash(tab.id, outcome.status === "saved");
}
