import { ERROR_CODES } from "@linkables/shared/http";
import { listLinksResponseSchema, type ListLinksResponse, type SavedLink } from "@linkables/shared/links";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/api";
import { isApiError } from "../api/client";
import { shouldRetry } from "../query-client";
import type { LinksView } from "./links-search";

// Metadata usually lands within seconds (brief 5.3) but can take minutes, so
// polling slows as the newest pending row ages and stops after two minutes.
const PENDING_BACKOFF = [
  { untilAgeMs: 10_000, intervalMs: 2000 },
  { untilAgeMs: 30_000, intervalMs: 5000 },
  { untilAgeMs: 120_000, intervalMs: 15_000 },
] as const;

export const linksKeys = {
  all: ["links"] as const,
  list: (view: LinksView) => ["links", "list", view] as const,
};

export type LinksPages = InfiniteData<ListLinksResponse, string | undefined>;

function listPath(view: LinksView, cursor: string | undefined): string {
  const params = new URLSearchParams();
  if (view === "inbox") params.set("view", "inbox");
  if (view === "pinned") params.set("pinned", "true");
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

export function useLinks(view: LinksView) {
  const queryClient = useQueryClient();
  const queryKey = linksKeys.list(view);
  const [pendingInterval] = useState(pendingPoller);
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => api.request(listPath(view, pageParam), listLinksResponseSchema, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor ?? undefined,
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
