import { flashSaveResult } from "../badge/saved-badge";
import { saveLink } from "../save/save-link";
import { SAVE_LINK_MENU_ID, saveFromMenu } from "./save-link-menu";

// Menu items outlive the worker, so they are made once per install or update.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: SAVE_LINK_MENU_ID, title: "Save link to linkables", contexts: ["link"] });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void saveFromMenu(info, tab, { save: saveLink, flash: flashSaveResult });
});
