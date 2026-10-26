import { LIST_LIMIT_MAX, listLinksResponseSchema, type SavedLink } from "@linkables/shared/links";
import { ownSharedCollectionsResponseSchema, shareStateSchema, type OwnSharedCollectionsResponse } from "@linkables/shared/sharing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";
import { env } from "../config/env";
import { saveCurrentTab } from "../save/save-flow";
import { saveLink } from "../save/save-link";
import { linksPath, pinnedFirst, type LinkTab } from "./link-list";
import { lookupQuery, savedMatch } from "./this-page";

const keys = {
  lists: ["panel", "links"] as const,
  list: (tab: LinkTab, query: string) => ["panel", "links", tab, query] as const,
  page: (url: string) => ["panel", "page", url] as const,
  shared: ["panel", "shared"] as const,
};

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

// null: this page is not saved, or its address is too long to look up.
export function usePageLink(url: string) {
  const query = lookupQuery(url);
  return useQuery({
    queryKey: keys.page(url),
    enabled: query !== null,
    queryFn: async (): Promise<SavedLink | null> => {
      const params = new URLSearchParams({ q: query ?? "", limit: String(LIST_LIMIT_MAX) });
      const { items } = await api.request(`/links?${params.toString()}`, listLinksResponseSchema);
      return savedMatch(url, items);
    },
  });
}

export function useSavePage(url: string, title: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => saveCurrentTab({ readTab: () => Promise.resolve({ url, title: title ?? undefined }), save: saveLink }),
    onSuccess: (outcome) => {
      if (outcome.status !== "saved") return;
      queryClient.setQueryData(keys.page(url), outcome.link);
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
