import {
  collectionSchema,
  listCollectionsResponseSchema,
  type ListCollectionsResponse,
  type ListedCollection,
} from "@linkables/shared/collections";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { api } from "../api/api";
import { linksKeys } from "../links/use-links";
import { useCollectionsUi } from "./collections-ui-store";

export const collectionsKeys = { all: ["collections"] as const };

const JSON_HEADERS = { "Content-Type": "application/json" };

// Pinned first, then most recently used: the API's order.
export function useCollections() {
  const deleting = useCollectionsUi((state) => state.deleting);
  const select = useCallback(
    (data: ListCollectionsResponse): ListedCollection[] => data.items.filter((item) => !(item.id in deleting)),
    [deleting],
  );
  return useQuery({
    queryKey: collectionsKeys.all,
    queryFn: ({ signal }) => api.request("/collections", listCollectionsResponseSchema, { signal }),
    select,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.request("/collections", collectionSchema, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ name }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionsKeys.all }),
  });
}

// Links carry their collections' names, so they refresh too.
export function useRenameCollection(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.request(`/collections/${collectionId}`, collectionSchema, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name }),
      }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: collectionsKeys.all }),
        queryClient.invalidateQueries({ queryKey: linksKeys.all }),
      ]),
  });
}
