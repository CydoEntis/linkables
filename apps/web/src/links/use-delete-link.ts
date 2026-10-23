import { ERROR_CODES } from "@linkables/shared/http";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/api";
import { isApiError } from "../api/client";
import { DELETE_UNDO_MS } from "../collections/use-delete-collection";
import { collectionsKeys } from "../collections/use-collections";
import { useLinksUi } from "./links-ui-store";
import { linksKeys, type LinksPages } from "./use-links";

function removeFromCache(queryClient: QueryClient, linkId: string) {
  queryClient.setQueriesData<LinksPages>({ queryKey: linksKeys.lists }, (data) =>
    data === undefined
      ? data
      : { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== linkId) })) },
  );
  queryClient.removeQueries({ queryKey: linksKeys.detail(linkId), exact: true });
}

// A link that is already gone on the server counts as deleted.
async function sendDelete(queryClient: QueryClient, linkId: string) {
  try {
    await api.request(`/links/${linkId}`, z.null(), { method: "DELETE" });
  } catch (error) {
    if (!isApiError(error, ERROR_CODES.NOT_FOUND)) {
      useLinksUi.getState().stopDeleting(linkId);
      toast.error("Couldn't delete the link. Try again.");
      return;
    }
  }
  removeFromCache(queryClient, linkId);
  useLinksUi.getState().stopDeleting(linkId);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: linksKeys.all }),
    queryClient.invalidateQueries({ queryKey: collectionsKeys.all }),
  ]);
}

// Undo instead of a confirm, as for collections: the row goes at once and the
// DELETE is sent when the toast closes, which hovering it postpones.
// shortcut: closing the tab while the toast is up keeps the link.
export function useDeleteLink() {
  const queryClient = useQueryClient();

  return (linkId: string) => {
    let settled = false;
    const send = () => {
      if (settled) return;
      settled = true;
      void sendDelete(queryClient, linkId);
    };
    const undo = () => {
      if (settled) return;
      settled = true;
      useLinksUi.getState().stopDeleting(linkId);
    };

    const ui = useLinksUi.getState();
    ui.startDeleting(linkId);
    ui.leave(linkId);
    toast("Link deleted", {
      duration: DELETE_UNDO_MS,
      onAutoClose: send,
      onDismiss: send,
      action: { label: "Undo", onClick: undo },
    });
  };
}
