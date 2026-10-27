import type { Group } from "@linkables/shared/groups";
import type { SavedLink } from "@linkables/shared/links";
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/api";
import { useLinksUi } from "../links/links-ui-store";
import { linksKeys, updateCachedLink, type LinksPages } from "../links/use-links";
import { refreshGroups } from "./use-groups";

// null is the collection's ungrouped links.
type GroupRef = Pick<Group, "id" | "name"> | null;
export type MoveChange = { link: SavedLink; collectionId: string; from: GroupRef; to: GroupRef };

const UNDO_MS = 5000;
// One queue, so a move and its Undo reach the server in the order they were made.
const MOVE_SCOPE = { id: "move-to-group" };

// Only the lists narrowed to a group carry groupId, so the cache is searched for such a copy;
// undefined when none is loaded.
export function cachedGroupId(queryClient: QueryClient, collectionId: string, linkId: string): string | null | undefined {
  for (const [, data] of queryClient.getQueriesData<LinksPages>({ queryKey: linksKeys.collection(collectionId) })) {
    const link = data?.pages.flatMap((page) => page.items).find((item) => item.id === linkId);
    if (link?.groupId !== undefined) return link.groupId;
  }
  return undefined;
}

const label =(group: GroupRef) => (group === null ? "Ungrouped" : group.name);

export function useMoveToGroup() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    scope: MOVE_SCOPE,
    mutationFn: ({ link, collectionId, to }: MoveChange & { toastId?: string | undefined }) =>
      api.request(`/collections/${collectionId}/links/${link.id}`, z.null(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: to?.id ?? null }),
      }),
    onMutate: ({ link, to }) => {
      updateCachedLink(queryClient, link.id, (item) => ({ ...item, groupId: to?.id ?? null }));
    },
    onError: (_error, { link, from, toastId }) => {
      updateCachedLink(queryClient, link.id, (item) => ({ ...item, groupId: from?.id ?? null }));
      toast.error("Couldn't move the link. Try again.", toastId === undefined ? {} : { id: toastId, action: null });
    },
    onSettled: (_data, _error, { collectionId }) => refreshGroups(queryClient, collectionId),
  });

  function move(change: MoveChange, { undoable = true } = {}) {
    useLinksUi.getState().leave(change.link.id);
    const toastId = undoable
      ? toastWithUndo(change, () => { move({ ...change, from: change.to, to: change.from }, { undoable: false }); })
      : undefined;
    mutation.mutate({ ...change, toastId });
  }

  return move;
}

function toastWithUndo({ to }: MoveChange, onUndo: () => void): string {
  const id = crypto.randomUUID();
  toast(`Moved to ${label(to)}`, { id, duration: UNDO_MS, action: { label: "Undo", onClick: onUndo } });
  return id;
}
