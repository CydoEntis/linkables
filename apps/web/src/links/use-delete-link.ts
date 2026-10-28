import { ERROR_CODES } from "@linkables/shared/http";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/api";
import { isApiError } from "@linkables/shared/api-client";
import { DELETE_UNDO_MS } from "../collections/use-delete-collection";
import { collectionsKeys } from "../collections/use-collections";
import { invalidateGroups } from "../collections/use-groups";
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
    invalidateGroups(queryClient),
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
      focusRestoredRow(linkId);
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

// The toast goes with Undo and sonner hands focus back to where it was before
// the toast, often the page or the list's heading (which only stood in for the
// deleted row). Once focus is out of the toast and the row is back, the row
// takes it, unless focus went somewhere of its own. About a second at most.
function focusRestoredRow(linkId: string, framesLeft = 60) {
  requestAnimationFrame(() => {
    const row = document.querySelector<HTMLElement>(`[data-row-link][data-link-id="${CSS.escape(linkId)}"]`);
    const active = document.activeElement;
    if (row === null || active?.closest("[data-sonner-toaster]")) {
      if (framesLeft > 0) focusRestoredRow(linkId, framesLeft - 1);
      return;
    }
    if (active === null || active === document.body || active.matches("main h1")) {
      row.focus({ preventScroll: true });
      // Sonner's blur handler can restore the heading during this focus call.
      if (document.activeElement !== row && framesLeft > 0) focusRestoredRow(linkId, framesLeft - 1);
    }
  });
}
