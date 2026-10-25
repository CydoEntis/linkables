import { ERROR_CODES } from "@linkables/shared/http";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/api";
import { isApiError } from "@linkables/shared/api-client";
import { linksKeys } from "../links/use-links";
import { useCollectionsUi } from "./collections-ui-store";
import { displayName } from "./display-name";
import { collectionsKeys } from "./use-collections";

export const DELETE_UNDO_MS = 5000;

type Deletable = { id: string; name: string };

function refresh(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: collectionsKeys.all }),
    queryClient.invalidateQueries({ queryKey: linksKeys.all }),
  ]);
}

// A delete that is already gone on the server counts as done.
async function sendDelete(queryClient: QueryClient, collection: Deletable) {
  const { stopDeleting } = useCollectionsUi.getState();
  try {
    await api.request(`/collections/${collection.id}`, z.null(), { method: "DELETE" });
  } catch (error) {
    if (!isApiError(error, ERROR_CODES.NOT_FOUND)) {
      stopDeleting(collection.id);
      toast.error(`Couldn't delete ${displayName(collection.name)}. Try again.`);
    }
  }
  await refresh(queryClient);
  stopDeleting(collection.id);
}

// Undo instead of a confirm: the collection disappears at once, and the DELETE
// goes when its toast closes. Hovering pauses the toast, so a timer of its own
// could send the DELETE while Undo is still on screen.
// shortcut: closing the tab while the toast is up drops the delete.
export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (collection: Deletable) => {
    const toastId = crypto.randomUUID();
    let settled = false;
    const send = () => {
      if (settled) return;
      settled = true;
      void sendDelete(queryClient, collection);
    };
    const undo = () => {
      if (settled) return;
      settled = true;
      useCollectionsUi.getState().stopDeleting(collection.id);
    };

    useCollectionsUi.getState().startDeleting(collection.id, {
      name: collection.name,
      undo: () => {
        undo();
        toast.dismiss(toastId);
      },
    });
    void navigate({ to: "/" });
    toast(`Deleted ${displayName(collection.name)}. Its links are still saved.`, {
      id: toastId,
      duration: DELETE_UNDO_MS,
      onAutoClose: send,
      onDismiss: send,
      action: { label: "Undo", onClick: undo },
    });
  };
}
