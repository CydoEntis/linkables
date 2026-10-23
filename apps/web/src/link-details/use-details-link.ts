import type { SavedLink } from "@linkables/shared/links";
import { notifyManager, useIsFetching, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useSyncExternalStore } from "react";
import { useLinksUi } from "../links/links-ui-store";
import { findCachedLink, linksKeys } from "../links/use-links";

export type DetailsLink = { status: "found"; link: SavedLink } | { status: "loading" } | { status: "gone" };

// There is no GET /links/:id, so details show the link as the loaded lists have
// it, and keep the last copy seen once a refetch drops it from them (filed out
// of To sort, say), so the panel does not empty under the user.
// shortcut: a link deep in an unloaded page reads as gone until it is loaded.
export function useDetailsLink(linkId: string): DetailsLink {
  const queryClient = useQueryClient();
  // Batched like TanStack's own hooks: a query created while another component renders must not update this one mid-render.
  const subscribe = useCallback(
    (onChange: () => void) => queryClient.getQueryCache().subscribe(notifyManager.batchCalls(onChange)),
    [queryClient],
  );
  const cached = useSyncExternalStore(subscribe, () => findCachedLink(queryClient, linkId));
  const fetching = useIsFetching({ queryKey: linksKeys.all }) > 0;
  const deleting = useLinksUi((state) => state.deletingIds.includes(linkId));
  const [last, setLast] = useState<SavedLink | null>(null);
  if (cached && cached !== last) setLast(cached);

  const link = cached ?? (last?.id === linkId ? last : undefined);
  if (deleting) return { status: "gone" };
  if (link) return { status: "found", link };
  const loaded = queryClient.getQueriesData({ queryKey: linksKeys.all }).some(([, data]) => data !== undefined);
  return fetching || !loaded ? { status: "loading" } : { status: "gone" };
}
