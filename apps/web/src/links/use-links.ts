import { ERROR_CODES } from "@linkables/shared/http";
import { listLinksResponseSchema, type ListLinksResponse, type SavedLink } from "@linkables/shared/links";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { api } from "../api/api";
import { isApiError } from "../api/client";
import { useCollectionsUi } from "../collections/collections-ui-store";
import { shouldRetry } from "../query-client";
import type { LinksView } from "./links-search";

// Metadata usually lands within seconds (brief 5.3) but can take minutes, so
// polling slows as the newest pending row ages and stops after two minutes.
const PENDING_BACKOFF = [
  { untilAgeMs: 10_000, intervalMs: 2000 },
  { untilAgeMs: 30_000, intervalMs: 5000 },
  { untilAgeMs: 120_000, intervalMs: 15_000 },
] as const;

// A list is one of the views, or one collection's links.
export type ListScope = { view: LinksView } | { collectionId: string };

export const linksKeys = {
  all: ["links"] as const,
  list: (view: LinksView) => ["links", "list", view] as const,
  collection: (collectionId: string) => ["links", "list", "collection", collectionId] as const,
};

export function scopeKey(scope: ListScope) {
  return "view" in scope ? linksKeys.list(scope.view) : linksKeys.collection(scope.collectionId);
}

// Whether a link still belongs in a list after a change made on this device.
export function belongsIn(scope: ListScope, link: SavedLink): boolean {
  if ("collectionId" in scope) return link.collections.some((collection) => collection.id === scope.collectionId);
  if (scope.view === "inbox") return link.collections.length === 0;
  if (scope.view === "pinned") return link.pinned;
  return true;
}

export type LinksPages = InfiniteData<ListLinksResponse, string | undefined>;

function listPath(scope: ListScope, cursor: string | undefined): string {
  const params = new URLSearchParams();
  if ("collectionId" in scope) params.set("collectionId", scope.collectionId);
  else if (scope.view === "inbox") params.set("view", "inbox");
  else if (scope.view === "pinned") params.set("pinned", "true");
  if (cursor !== undefined) params.set("cursor", cursor);
  const query = params.toString();
  return query ? `/links?${query}` : "/links";
}

export function isPending(link: SavedLink): boolean {
  return link.resource.fetchStatus === "pending";
}

// Ages a pending row from when this client first saw it, not from the server's
// savedAt, so a device clock ahead of the server cannot stop polling early.
export function pendingPoller() {
  const firstSeen = new Map<string, number>();
  return (data: LinksPages | undefined, now: number): number | false => {
    const pendingIds = (data?.pages ?? []).flatMap((page) => page.items.filter(isPending).map((link) => link.id));
    for (const id of firstSeen.keys()) if (!pendingIds.includes(id)) firstSeen.delete(id);
    if (pendingIds.length === 0) return false;
    for (const id of pendingIds) if (!firstSeen.has(id)) firstSeen.set(id, now);
    const age = now - Math.max(...firstSeen.values());
    return PENDING_BACKOFF.find((step) => age < step.untilAgeMs)?.intervalMs ?? false;
  };
}

// A collection inside its Undo window is hidden at render, so a refetch cannot bring it back.
function withoutCollections(data: LinksPages, hidden: Readonly<Record<string, unknown>>): LinksPages {
  if (Object.keys(hidden).length === 0) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => ({ ...item, collections: item.collections.filter((collection) => !(collection.id in hidden)) })),
    })),
  };
}

export function useLinks(scope: ListScope) {
  const queryClient = useQueryClient();
  const queryKey = scopeKey(scope);
  const [pendingInterval] = useState(pendingPoller);
  const deleting = useCollectionsUi((state) => state.deleting);
  const select = useCallback((data: LinksPages) => withoutCollections(data, deleting), [deleting]);
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => api.request(listPath(scope, pageParam), listLinksResponseSchema, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
    select,
    refetchInterval: (current) => pendingInterval(current.state.data, Date.now()),
    retry: (failures, error) => !isApiError(error, ERROR_CODES.VALIDATION) && shouldRetry(failures, error),
  });

  // The API rejects a cursor whose link was renamed or deleted; the list restarts from the top.
  async function loadMore(): Promise<void> {
    const result = await query.fetchNextPage();
    if (result.isFetchNextPageError && isApiError(result.error, ERROR_CODES.VALIDATION)) {
      await queryClient.resetQueries({ queryKey });
    }
  }

  return { query, loadMore };
}
