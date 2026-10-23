import { savedLinkSchema, type SavedLink } from "@linkables/shared/links";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "../api/api";
import { findCachedLink, linksKeys, type LinksPages } from "../links/use-links";

// One field at a time, as the shared schema outputs it: trimmed, with blank as null.
export type LinkEdits = { titleOverride: string | null } | { note: string | null };


function patchLists(queryClient: QueryClient, linkId: string, edits: Partial<SavedLink>) {
  queryClient.setQueriesData<LinksPages>({ queryKey: linksKeys.all }, (data) =>
    data === undefined
      ? data
      : {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => (item.id === linkId ? { ...item, ...edits } : item)),
          })),
        },
  );
}

function previousValues(link: SavedLink | undefined, edits: LinkEdits): Partial<SavedLink> | undefined {
  if (link === undefined) return undefined;
  return "note" in edits ? { note: link.note } : { titleOverride: link.titleOverride };
}

function patchLink(linkId: string, edits: LinkEdits, keepalive = false) {
  return api.request(`/links/${linkId}`, savedLinkSchema, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(edits),
    keepalive,
  });
}

// For a page that is going away (reload, navigation, tab close): a mutation
// awaits before its request starts, and the page would be gone by then, so this
// starts the keepalive request at once, outside the per-link queue.
// shortcut: an earlier save still in flight may land after this one.
export function saveAsPageLeaves(queryClient: QueryClient, linkId: string, edits: LinkEdits): Promise<unknown> {
  const previous = previousValues(findCachedLink(queryClient, linkId), edits);
  patchLists(queryClient, linkId, edits);
  return patchLink(linkId, edits, true).catch((error: unknown) => {
    if (previous) patchLists(queryClient, linkId, previous);
    throw error;
  });
}

// Edits show in every loaded list at once and roll back if the API refuses them.
// One queue per link keeps a slow save from landing after a newer one.
export function useUpdateLink(linkId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: { id: `edit-${linkId}` },
    mutationFn: ({ edits }: { edits: LinkEdits }) => patchLink(linkId, edits),
    onMutate: async ({ edits }) => {
      await queryClient.cancelQueries({ queryKey: linksKeys.all });
      const previous = previousValues(findCachedLink(queryClient, linkId), edits);
      patchLists(queryClient, linkId, edits);
      return { previous };
    },
    onError: (_error, _edits, context) => {
      if (context?.previous) patchLists(queryClient, linkId, context.previous);
    },
    // A new title can move the link in a title-sorted list; a note moves nothing.
    onSuccess: (_link, { edits }) => {
      if ("titleOverride" in edits) void queryClient.invalidateQueries({ queryKey: linksKeys.all });
    },
  });
}
