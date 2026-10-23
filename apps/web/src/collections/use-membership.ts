import type { ListCollectionsResponse } from "@linkables/shared/collections";
import type { SavedLink } from "@linkables/shared/links";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/api";
import { useLinksUi } from "../links/links-ui-store";
import { linksKeys, type LinksPages } from "../links/use-links";
import { collectionsKeys } from "./use-collections";
import { displayName } from "./display-name";

export type CollectionRef = SavedLink["collections"][number];
export type MembershipChange = { link: SavedLink; collection: CollectionRef; filed: boolean };

const MEMBERSHIP_KEY = ["membership"] as const;
const UNDO_MS = 5000;

// Matches the API's order for a link's collections: by name, ignoring case.
export function withMembership(collections: readonly CollectionRef[], collection: CollectionRef, filed: boolean): CollectionRef[] {
  const others = collections.filter((item) => item.id !== collection.id);
  if (!filed) return others;
  return [...others, collection].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

function applyToLinks(queryClient: QueryClient, { link, collection, filed }: MembershipChange) {
  queryClient.setQueriesData<LinksPages>({ queryKey: linksKeys.all }, (data) =>
    data === undefined
      ? data
      : {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) =>
              item.id === link.id ? { ...item, collections: withMembership(item.collections, collection, filed) } : item,
            ),
          })),
        },
  );
}

// The cover refreshes from the server; the count and recent order move at once.
function applyToCollections(queryClient: QueryClient, { collection, filed }: MembershipChange) {
  queryClient.setQueryData<ListCollectionsResponse>(collectionsKeys.all, (data) =>
    data === undefined
      ? data
      : {
          items: data.items.map((item) =>
            item.id === collection.id
              ? { ...item, linkCount: Math.max(0, item.linkCount + (filed ? 1 : -1)), lastUsedAt: new Date().toISOString() }
              : item,
          ),
        },
  );
}

function apply(queryClient: QueryClient, change: MembershipChange) {
  applyToLinks(queryClient, change);
  applyToCollections(queryClient, change);
}

export function useMembership() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: MEMBERSHIP_KEY,
    mutationFn: ({ link, collection, filed }: MembershipChange) =>
      api.request(`/collections/${collection.id}/links/${link.id}`, z.null(), { method: filed ? "PUT" : "DELETE" }),
    onMutate: async (change) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: linksKeys.all }),
        queryClient.cancelQueries({ queryKey: collectionsKeys.all }),
      ]);
      apply(queryClient, change);
    },
    onError: (_error, change) => {
      apply(queryClient, { ...change, filed: !change.filed });
      toast.error(`Couldn't update ${displayName(change.collection.name)}. Try again.`);
    },
    // Several ticks in a row would refetch over each other's optimistic state, so only the last one refreshes.
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey: MEMBERSHIP_KEY }) > 1) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: linksKeys.all }),
        queryClient.invalidateQueries({ queryKey: collectionsKeys.all }),
      ]);
    },
  });

  function setFiled(change: MembershipChange, { undoable = true }: { undoable?: boolean } = {}) {
    useLinksUi.getState().leave(change.link.id);
    mutation.mutate(change);
    if (!undoable) return;
    const name = displayName(change.collection.name);
    toast(change.filed ? `Added to ${name}` : `Removed from ${name}`, {
      duration: UNDO_MS,
      action: {
        label: "Undo",
        onClick: () => { setFiled({ ...change, filed: !change.filed }, { undoable: false }); },
      },
    });
  }

  return setFiled;
}
