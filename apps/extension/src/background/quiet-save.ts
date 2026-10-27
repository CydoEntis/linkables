import { saveCurrentTab } from "../save/save-flow";
import { hintFor, MENU_HINTS, type MenuDeps } from "./save-link-menu";

// Named in manifest.ts (both browsers' commands).
export const QUIET_SAVE_COMMAND = "save-quietly";

// The pop-up's save without the pop-up: the shortcut grants activeTab on the tab, which
// then answers with the toolbar badge, as the right-click menu does.
export async function saveQuietly(command: string, tab: chrome.tabs.Tab | undefined, deps: MenuDeps): Promise<void> {
  if (command !== QUIET_SAVE_COMMAND || tab?.id === undefined) return;
  if (!(await deps.signedIn())) {
    await deps.flash(tab.id, false, MENU_HINTS.signedOut);
    return;
  }
  const outcome = await saveCurrentTab({ readTab: () => Promise.resolve(tab), save: deps.save });
  await deps.flash(tab.id, outcome.status === "saved", hintFor(outcome));
}
