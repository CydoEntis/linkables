import { SAVE_LINK_MENU_ID, saveFromMenu } from "./save-link-menu";
import { workerSaveDeps } from "./worker-save";

// Menu items outlive the worker and an update keeps them, so the old item goes
// first; creating the same id twice would fail.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: SAVE_LINK_MENU_ID, title: "Save link to linkables", contexts: ["link"] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void saveFromMenu(info, tab, workerSaveDeps);
});
