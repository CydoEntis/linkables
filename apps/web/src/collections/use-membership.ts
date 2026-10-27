import type { ListCollectionsResponse } from "@linkables/shared/collections";
import type { SavedLink } from "@linkables/shared/links";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/api";
import { useLinksUi } from "../links/links-ui-store";
import { linksKeys, updateCachedLink } from "../links/use-links";
import { collectionsKeys } from "./use-collections";
import { invalidateGroups } from "./use-groups";
import { displayName } from "./display-name";

export type CollectionRef = SavedLink["collections"][number];
export type MembershipChange = { link: SavedLink; collection: CollectionRef; filed: boolean };

const MEMBERSHIP_KEY = ["membership"] as const;
// One queue for every filing change: a quick tick and untick could otherwise
// reach the server in either order and leave it disagreeing with the picker.
const MEMBERSHIP_SCOPE = { id: "membership" };
const UNDO_MS = 5000;

// Matches the API's order for a link's collections: by name, ignoring case.
export function withMembership(collections: readonly CollectionRef[], collection: CollectionRef, filed: boolean): CollectionRef[] {
  const others = collections.filter((item) => item.id !== collection.id);
  if (!filed) return others;
  return [...others, collection].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

function applyToLinks(queryClient: QueryClient, { link, collection, filed }: MembershipChange) {
  updateCachedLink(queryClient, link.id, (item) => ({ ...item, collections: withMembership(item.collections, collection, filed) }));
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

// onFiled: told of every state the picker should show, including Undo and a revert.
// toastId: the "Added to X · Undo" toast, which a failure replaces with the error.
type SetFiledOptions = { undoable?: boolean; onFiled?: ((filed: boolean) => void) | undefined };
type MembershipVariables = MembershipChange & { toastId?: string | undefined; onFiled?: SetFiledOptions["onFiled"] };

export function useMembership() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationKey: MEMBERSHIP_KEY,
    scope: MEMBERSHIP_SCOPE,
    mutationFn: ({ link, collection, filed }: MembershipVariables) =>
      api.request(`/collections/${collection.id}/links/${link.id}`, z.null(), { method: filed ? "PUT" : "DELETE" }),
    onMutate: async (change) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: linksKeys.all }),
        queryClient.cancelQueries({ queryKey: collectionsKeys.all }),
      ]);
      apply(queryClient, change);
    },
    // No Undo survives for a change that never happened.
    onError: (_error, { toastId, onFiled, ...change }) => {
      apply(queryClient, { ...change, filed: !change.filed });
      onFiled?.(!change.filed);
      toast.error(`Couldn't update ${displayName(change.collection.name)}. Try again.`, toastId === undefined ? {} : { id: toastId, action: null });
    },
    // Several ticks in a row would refetch over each other's optimistic state, so only the last one refreshes.
    onSettled: async () => {
      if (queryClient.isMutating({ mutationKey: MEMBERSHIP_KEY }) > 1) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: linksKeys.all }),
        queryClient.invalidateQueries({ queryKey: collectionsKeys.all }),
        invalidateGroups(queryClient),
      ]);
    },
  });

  function setFiled(change: MembershipChange, { undoable = true, onFiled }: SetFiledOptions = {}) {
    useLinksUi.getState().leave(change.link.id);
    onFiled?.(change.filed);
    const toastId = undoable
      ? undoToast(change, () => { setFiled({ ...change, filed: !change.filed }, { undoable: false, onFiled }); })
      : undefined;
    mutation.mutate({ ...change, toastId, onFiled });
  }

  return setFiled;
}

function undoToast(change: MembershipChange, onUndo: () => void): string {
  const id = crypto.randomUUID();
  const name = displayName(change.collection.name);
  toast(change.filed ? `Added to ${name}` : `Removed from ${name}`, {
    id,
    duration: UNDO_MS,
    action: { label: "Undo", onClick: onUndo },
  });
  return id;
}
