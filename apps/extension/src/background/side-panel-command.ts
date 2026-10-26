import { OPEN_SIDE_PANEL_COMMAND, openSidePanel } from "../side-panel/open-side-panel";

// A worker's listeners must be added as it starts, or Chrome drops the event that woke it.
chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== OPEN_SIDE_PANEL_COMMAND || tab?.windowId === undefined) return;
  void openSidePanel(tab.windowId);
});
