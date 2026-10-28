import { saveLinkResponseSchema, type SaveLinkRequest } from "@linkables/shared/links";
import { api } from "../api/api";
import { hasSession } from "../auth/session";
import { flashSaveResult } from "../badge/saved-badge";
import type { MenuDeps } from "./save-link-menu";

function saveLink(body: SaveLinkRequest) {
  return api.request("/links", saveLinkResponseSchema, { method: "POST", json: body });
}

export const workerSaveDeps: MenuDeps = { save: saveLink, signedIn: hasSession, flash: flashSaveResult };
