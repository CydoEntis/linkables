import { ERROR_CODES } from "@linkables/shared/http";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/api";
import { isApiError } from "../api/client";
import { linksKeys, type LinksPages } from "../links/use-links";
import { useCollectionsUi } from "./collections-ui-store";
import { displayName } from "./display-name";
import { collectionsKeys } from "./use-collections";

export const DELETE_UNDO_MS = 5000;

type Deletable = { id: string; name: string };

function forgetInLinks(queryClient: QueryClient, collectionId: string) {
  queryClient.setQueriesData<LinksPages>({ queryKey: linksKeys.all }, (data) =>
    data === undefined
      ? data
      : {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => ({
              ...item,
              collections: item.collections.filter((collection) => collection.id !== collectionId),
            })),
          })),
        },
  );
}

function refresh(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: collectionsKeys.all }),
    queryClient.invalidateQueries({ queryKey: linksKeys.all }),
  ]);
}

// A delete that is already gone on the server counts as done.
async function sendDelete(queryClient: QueryClient, collection: Deletable) {
  const { unhide } = useCollectionsUi.getState();
  try {
    await api.request(`/collections/${collection.id}`, z.null(), { method: "DELETE" });
  } catch (error) {
    if (!isApiError(error, ERROR_CODES.NOT_FOUND)) {
      unhide(collection.id);
      toast.error(`Couldn't delete ${displayName(collection.name)}. Try again.`);
    }
  }
  await refresh(queryClient);
  unhide(collection.id);
}

// Undo instead of a confirm: the collection disappears at once and the DELETE
// waits out the Undo window.
// shortcut: closing the tab inside the Undo window drops the delete.
export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return (collection: Deletable) => {
    useCollectionsUi.getState().hide(collection.id);
    forgetInLinks(queryClient, collection.id);
    void navigate({ to: "/" });
    const timer = setTimeout(() => void sendDelete(queryClient, collection), DELETE_UNDO_MS);
    toast(`Deleted ${displayName(collection.name)}. Its links are still saved.`, {
      duration: DELETE_UNDO_MS,
      action: {
        label: "Undo",
        onClick: () => {
          clearTimeout(timer);
          useCollectionsUi.getState().unhide(collection.id);
          void queryClient.invalidateQueries({ queryKey: linksKeys.all });
        },
      },
    });
  };
}
