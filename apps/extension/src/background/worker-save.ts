import { saveLinkResponseSchema, type SaveLinkRequest } from "@linkables/shared/links";
import { createApiClient } from "../api/client";
import { AUTH_STORAGE_KEY } from "../auth/create-supabase";
import { hasSession } from "../auth/worker-sign-in";
import { flashSaveResult } from "../badge/saved-badge";
import { env } from "../config/env";
import type { MenuDeps } from "./save-link-menu";
import { usableAccessToken } from "./stored-token";

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

// What the worker's saves (right-click menu, shortcut) run on.
export const workerSaveDeps: MenuDeps = { save: saveLink, signedIn: hasSession, flash: flashSaveResult };
