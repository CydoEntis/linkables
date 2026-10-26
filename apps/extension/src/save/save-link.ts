import { saveLinkResponseSchema, type SaveLinkRequest } from "@linkables/shared/links";
import { api } from "../api/api";

export function saveLink(body: SaveLinkRequest) {
  return api.request("/links", saveLinkResponseSchema, { method: "POST", json: body });
}
