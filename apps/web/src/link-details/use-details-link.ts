import { ERROR_CODES } from "@linkables/shared/http";
import { savedLinkSchema, type SavedLink } from "@linkables/shared/links";
import { notifyManager, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useSyncExternalStore } from "react";
import { api } from "../api/api";
import { isApiError } from "@linkables/shared/api-client";
import { useLinksUi } from "../links/links-ui-store";
import { findListedLink, linksKeys } from "../links/use-links";
import { shouldRetry } from "../query-client";

export type DetailsLink =
  | { status: "found"; link: SavedLink }
  | { status: "loading" }
  | { status: "gone" }
  | { status: "failed"; retry: () => void };

// Details show the link as the loaded lists have it, and fetch it on its own
// only when no list holds it (an address opened directly, or a link deep in an
// unloaded page). The fetch starts from the list's copy, so a link a refetch
// drops from the lists (filed out of New, say) stays up while it refreshes.
export function useDetailsLink(linkId: string): DetailsLink {
  const queryClient = useQueryClient();
  // Batched like TanStack's own hooks: a query created while another component renders must not update this one mid-render.
  const subscribe = useCallback(
    (onChange: () => void) => queryClient.getQueryCache().subscribe(notifyManager.batchCalls(onChange)),
    [queryClient],
  );
  const listed = useSyncExternalStore(subscribe, () => findListedLink(queryClient, linkId));
  const own = useQuery({
    queryKey: linksKeys.detail(linkId),
    queryFn: ({ signal }) => api.request(`/links/${linkId}`, savedLinkSchema, { signal }),
    initialData: () => findListedLink(queryClient, linkId),
    enabled: listed === undefined,
    retry: (failures, error) => !isApiError(error, ERROR_CODES.NOT_FOUND) && shouldRetry(failures, error),
  });
  const deleting = useLinksUi((state) => state.deletingIds.includes(linkId));

  if (deleting) return { status: "gone" };
  if (listed) return { status: "found", link: listed };
  if (isApiError(own.error, ERROR_CODES.NOT_FOUND)) return { status: "gone" };
  if (own.data) return { status: "found", link: own.data };
  return own.isError ? { status: "failed", retry: () => void own.refetch() } : { status: "loading" };
}
