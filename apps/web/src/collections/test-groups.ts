import { ApiError } from "@linkables/shared/api-client";
import type { Group } from "@linkables/shared/groups";
import type { SavedLink } from "@linkables/shared/links";
import { listedCollection } from "./test-collections";
import { savedLink } from "../links/test-links";

export function group(name: string, position: number, linkCount = 0): Group {
  return { id: crypto.randomUUID(), name, position, shared: true, linkCount };
}

type Filed = { link: SavedLink; groupId: string | null };

// The API's group routes over memory, enough for the collection page to run against.
export function fakeGroupServer(collectionId: string, groups: Group[], filed: Filed[], outside: SavedLink[] = []) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const counted = () =>
    [...groups]
      .sort((a, b) => a.position - b.position)
      .map((item) => ({ ...item, linkCount: filed.filter((entry) => entry.groupId === item.id).length }));

  function request(path: string, _schema: unknown, init?: RequestInit): Promise<unknown> {
    const method = init?.method ?? "GET";
    const body: unknown = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ method, path, body });
    const base = `/collections/${collectionId}`;
    if (path === `${base}/groups` && method === "GET") return Promise.resolve({ items: counted() });
    if (path === `${base}/groups` && method === "POST") return create((body as { name: string }).name);
    if (path === `${base}/groups/order` && method === "PUT") return reorder((body as { ids: string[] }).ids);
    const one = /\/groups\/([^/]+)$/.exec(path)?.[1];
    if (one !== undefined && method === "PATCH") return rename(one, (body as { name: string }).name);
    if (one !== undefined && method === "DELETE") return remove(one);
    const own = /\/collections\/[^/]+\/links\/([^/]+)$/.exec(path)?.[1];
    if (own !== undefined && method === "PUT") return fileLink(own);
    if (own !== undefined && method === "DELETE") return unfile(own);
    const deleted = /^\/links\/([^/]+)$/.exec(path)?.[1];
    if (deleted !== undefined && method === "DELETE") return unfile(deleted);
    if (path === "/collections") return Promise.resolve({ items: [{ ...listedCollection({ id: collectionId, name: "Rust" }), linkCount: filed.length }] });
    const moved = /\/links\/([^/]+)$/.exec(path)?.[1];
    if (moved !== undefined && method === "PATCH") return move(moved, (body as { groupId: string | null }).groupId);
    if (path.startsWith("/links?")) return Promise.resolve(list(new URLSearchParams(path.split("?")[1])));
    return Promise.resolve({ items: [] });
  }

  function fileLink(linkId: string) {
    const known = outside.find((link) => link.id === linkId);
    if (known && !filed.some((entry) => entry.link.id === linkId)) filed.push({ link: known, groupId: null });
    return Promise.resolve(null);
  }

  function unfile(linkId: string) {
    const index = filed.findIndex((entry) => entry.link.id === linkId);
    if (index >= 0) filed.splice(index, 1);
    return Promise.resolve(null);
  }

  function create(name: string) {
    if (groups.some((item) => item.name.toLowerCase() === name.toLowerCase())) return Promise.reject(new ApiError("CONFLICT", "taken"));
    const created = group(name, groups.length);
    groups.push(created);
    return Promise.resolve(created);
  }

  function rename(id: string, name: string) {
    const found = groups.find((item) => item.id === id);
    if (!found) return Promise.reject(new ApiError("NOT_FOUND", "gone"));
    if (groups.some((item) => item.id !== id && item.name.toLowerCase() === name.toLowerCase())) return Promise.reject(new ApiError("CONFLICT", "taken"));
    found.name = name;
    return Promise.resolve(found);
  }

  function remove(id: string) {
    groups.splice(groups.findIndex((item) => item.id === id), 1);
    for (const entry of filed) if (entry.groupId === id) entry.groupId = null;
    return Promise.resolve(null);
  }

  function reorder(ids: string[]) {
    ids.forEach((id, position) => { const found = groups.find((item) => item.id === id); if (found) found.position = position; });
    return Promise.resolve({ items: counted() });
  }

  function move(linkId: string, groupId: string | null) {
    const entry = filed.find((item) => item.link.id === linkId);
    if (entry) entry.groupId = groupId;
    return Promise.resolve(null);
  }

  function list(params: URLSearchParams) {
    const wanted = params.get("groupId");
    const items = filed
      .filter((entry) => wanted === null || (wanted === "none" ? entry.groupId === null : entry.groupId === wanted))
      .filter((entry) => params.get("q") === null || entry.link.resource.title?.toLowerCase().includes((params.get("q") ?? "").toLowerCase()))
      .map((entry) => ({ ...entry.link, groupId: entry.groupId }));
    return { items, cursor: null };
  }

  return { request, calls };
}

export function filedLink(title: string, collectionId: string, groupId: string | null): Filed {
  return { link: savedLink({ resource: { title }, collections: [{ id: collectionId, name: "Rust" }] }), groupId };
}
