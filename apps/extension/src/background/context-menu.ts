import { supabase } from "../auth/supabase";
import { flashSaveResult } from "../badge/saved-badge";
import { saveLink } from "../save/save-link";
import { SAVE_LINK_MENU_ID, saveFromMenu } from "./save-link-menu";

// Menu items outlive the worker and an update keeps them, so the old item goes
// first; creating the same id twice would fail.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: SAVE_LINK_MENU_ID, title: "Save link to linkables", contexts: ["link"] });
  });
});

async function signedIn(): Promise<boolean> {
  return (await supabase.auth.getSession()).data.session !== null;
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void saveFromMenu(info, tab, { save: saveLink, signedIn, flash: flashSaveResult });
});
