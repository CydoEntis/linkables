import { ERROR_CODES } from "@linkables/shared/http";
import { savedLinkSchema, type SavedLink } from "@linkables/shared/links";
import { notifyManager, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState, useSyncExternalStore } from "react";
import { api } from "../api/api";
import { isApiError } from "@linkables/shared/api-client";
import { useLinksUi } from "../links/links-ui-store";
import { findCachedLink, findListedCopy, isPending, linksKeys, pendingPoller } from "../links/use-links";
import { shouldRetry } from "../query-client";

export type DetailsLink =
  | { status: "found"; link: SavedLink }
  | { status: "loading" }
  | { status: "gone" }
  | { status: "failed"; retry: () => void };

// Details show the freshest cached copy of the link, and fetch it on their own
// when no list holds it (an address opened directly, or a link deep in an
// unloaded page) or while its metadata is pending, since the list holding it
// may be off screen and not polling. The fetch starts from the list's copy, so
// a link a refetch drops from the lists (filed out of New, say) stays up.
export function useDetailsLink(linkId: string): DetailsLink {
  const queryClient = useQueryClient();
  // Batched like TanStack's own hooks: a query created while another component renders must not update this one mid-render.
  const subscribe = useCallback(
    (onChange: () => void) => queryClient.getQueryCache().subscribe(notifyManager.batchCalls(onChange)),
    [queryClient],
  );
  const cached = useSyncExternalStore(subscribe, () => findCachedLink(queryClient, linkId));
  const [pendingInterval] = useState(pendingPoller);
  const own = useQuery({
    queryKey: linksKeys.detail(linkId),
    queryFn: ({ signal }) => api.request(`/links/${linkId}`, savedLinkSchema, { signal }),
    initialData: () => findListedCopy(queryClient, linkId)?.link,
    initialDataUpdatedAt: () => findListedCopy(queryClient, linkId)?.updatedAt,
    enabled: cached === undefined || isPending(cached),
    refetchInterval: (query) => pendingInterval(query.state.data ? [query.state.data] : [], Date.now()),
    retry: (failures, error) => !isApiError(error, ERROR_CODES.NOT_FOUND) && shouldRetry(failures, error),
  });
  const deleting = useLinksUi((state) => state.deletingIds.includes(linkId));

  if (deleting) return { status: "gone" };
  if (isApiError(own.error, ERROR_CODES.NOT_FOUND)) return { status: "gone" };
  if (cached) return { status: "found", link: cached };
  return own.isError ? { status: "failed", retry: () => void own.refetch() } : { status: "loading" };
}
