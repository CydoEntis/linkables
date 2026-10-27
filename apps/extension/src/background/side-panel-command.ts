import { openSidePanelCommand, openSidePanelOrApp } from "../side-panel/open-side-panel";

// A worker's listeners must be added as it starts, or Chrome drops the event that woke it.
chrome.commands.onCommand.addListener((command, tab) => {
  if (command !== openSidePanelCommand()) return;
  void openSidePanelOrApp(tab?.windowId);
});
