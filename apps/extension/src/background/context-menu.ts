import { saveLinkResponseSchema, type SaveLinkRequest } from "@linkables/shared/links";
import { createApiClient } from "../api/client";
import { AUTH_STORAGE_KEY } from "../auth/create-supabase";
import { hasSession } from "../auth/worker-sign-in";
import { flashSaveResult } from "../badge/saved-badge";
import { env } from "../config/env";
import { SAVE_LINK_MENU_ID, saveFromMenu } from "./save-link-menu";
import { usableAccessToken } from "./stored-token";

// Menu items outlive the worker and an update keeps them, so the old item goes
// first; creating the same id twice would fail.
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: SAVE_LINK_MENU_ID, title: "Save link to linkables", contexts: ["link"] });
  });
});

// Not the pages' api client: that one refreshes the session, which the worker must
// leave to the pop-up and panel. A rejected token is theirs to sign out, too.
const workerApi = createApiClient({
  baseUrl: env.VITE_APP_URL,
  getAccessToken: async () => usableAccessToken((await chrome.storage.local.get(AUTH_STORAGE_KEY))[AUTH_STORAGE_KEY], Date.now()),
  onUnauthenticated: () => Promise.resolve(),
});

function saveLink(body: SaveLinkRequest) {
  return workerApi.request("/links", saveLinkResponseSchema, { method: "POST", json: body });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  void saveFromMenu(info, tab, { save: saveLink, signedIn: hasSession, flash: flashSaveResult });
});
