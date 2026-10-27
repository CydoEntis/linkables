import { LIST_LIMIT_MAX, listLinksResponseSchema, type SavedLink } from "@linkables/shared/links";
import { ownSharedCollectionsResponseSchema, shareStateSchema, type OwnSharedCollectionsResponse } from "@linkables/shared/sharing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";
import { env } from "../config/env";
import { saveCurrentTab } from "../save/save-flow";
import { saveLink } from "../save/save-link";
import { collectionLinksPath } from "./group-sections";
import { linksPath, pinnedFirst, type LinkTab } from "./link-list";
import { findPageLink, lookupQuery, type PageLookup } from "./this-page";

// Everything the panel lists from /links: a change to a link refreshes all of it.
export const PANEL_LISTS_KEY = ["panel", "links"] as const;

const keys = {
  lists: PANEL_LISTS_KEY,
  list: (tab: LinkTab, query: string) => ["panel", "links", tab, query] as const,
  section: (collectionId: string, groupId: string | undefined) => ["panel", "links", "collection", collectionId, groupId ?? "all"] as const,
  page: (url: string) => ["panel", "page", url] as const,
  shared: ["panel", "shared"] as const,
};

// A section stays short; the rest is a click away in the web app.
const SECTION_LINKS = 5;

// The web app's shared page path (apps/web/src/sharing/path.ts).
const SHARED_PATH_PREFIX = "/s/";

export function sharedUrl(token: string): string {
  return `${env.VITE_APP_URL.replace(/\/+$/, "")}${SHARED_PATH_PREFIX}${token}`;
}

export function appUrl(path: string): string {
  return `${env.VITE_APP_URL.replace(/\/+$/, "")}${path}`;
}

export function usePanelLinks(tab: LinkTab, query: string) {
  return useQuery({
    queryKey: keys.list(tab, query),
    queryFn: () => api.request(linksPath(tab, query), listLinksResponseSchema),
    select: (data) => ({ items: pinnedFirst(data.items), more: data.cursor !== null }),
  });
}

// The first few links of a collection, or of one of its groups (UNGROUPED for the links in none).
export function useCollectionLinks(collectionId: string, groupId: string | undefined) {
  return useQuery({
    queryKey: keys.section(collectionId, groupId),
    queryFn: () => api.request(collectionLinksPath(collectionId, groupId, SECTION_LINKS), listLinksResponseSchema),
    select: (data) => ({ items: data.items, more: data.cursor !== null }),
  });
}

function searchPage(query: string, cursor: string | undefined) {
  const params = new URLSearchParams({ q: query, limit: String(LIST_LIMIT_MAX) });
  if (cursor !== undefined) params.set("cursor", cursor);
  return api.request(`/links?${params.toString()}`, listLinksResponseSchema);
}

export function usePageLink(url: string) {
  return useQuery({
    queryKey: keys.page(url),
    queryFn: () => findPageLink(url, (cursor) => searchPage(lookupQuery(url) ?? "", cursor)),
  });
}

// Keeps the page's cached link in step with a pin or filing change made in the
// panel, so the card shows it again after a tab switch, and the lists refetch.
export function useUpdatePageLink(url: string) {
  const queryClient = useQueryClient();
  return (update: (link: SavedLink) => SavedLink) => {
    // A refetch already on its way read the server before this change, so it must not land.
    void queryClient.cancelQueries({ queryKey: keys.page(url) });
    queryClient.setQueryData<PageLookup>(keys.page(url), (lookup) => (lookup?.status === "saved" ? { status: "saved", link: update(lookup.link) } : lookup));
    void queryClient.invalidateQueries({ queryKey: keys.lists });
  };
}

export function useSavePage(url: string, title: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => saveCurrentTab({ readTab: () => Promise.resolve({ url, title: title ?? undefined }), save: saveLink }),
    onSuccess: (outcome) => {
      if (outcome.status !== "saved") return;
      const saved: PageLookup = { status: "saved", link: outcome.link };
      queryClient.setQueryData(keys.page(url), saved);
      void queryClient.invalidateQueries({ queryKey: keys.lists });
    },
  });
}

// collection id → its share token, for the collections whose link is on.
export function useShareTokens() {
  return useQuery({
    queryKey: keys.shared,
    queryFn: () => api.request("/collections/shared", ownSharedCollectionsResponseSchema),
    select: (data): ReadonlyMap<string, string> => new Map(data.items.map((item) => [item.id, item.token])),
  });
}

// POST turns the link on (keeping one that is already on); DELETE turns it off.
export function useSetSharing(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (on: boolean) => api.request(`/collections/${collectionId}/share`, shareStateSchema, { method: on ? "POST" : "DELETE" }),
    onSuccess: async (_state, on) => {
      // A link turned off is dead at once, so nothing may offer to copy it while the list refetches.
      if (!on) {
        queryClient.setQueryData<OwnSharedCollectionsResponse>(keys.shared, (data) => data && { items: data.items.filter((item) => item.id !== collectionId) });
      }
      // Awaited, so Get share link keeps its spinner until the new link is there to show.
      await queryClient.invalidateQueries({ queryKey: keys.shared });
    },
  });
}
