import { collectionSchema, listCollectionsResponseSchema } from "@linkables/shared/collections";
import type { SavedLink } from "@linkables/shared/links";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { api } from "../api/api";
import { displayName } from "./picker";

const collectionsKey = ["collections"] as const;

export type CollectionRef = SavedLink["collections"][number];

export function useCollections() {
  return useQuery({
    queryKey: collectionsKey,
    queryFn: () => api.request("/collections", listCollectionsResponseSchema),
    select: (data) => data.items,
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.request("/collections", collectionSchema, { method: "POST", json: { name } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: collectionsKey }),
  });
}

// Matches the API's order for a link's collections: by name, ignoring case.
function withCollection(current: readonly CollectionRef[], collection: CollectionRef, filed: boolean): CollectionRef[] {
  const others = current.filter((item) => item.id !== collection.id);
  if (!filed) return others;
  return [...others, collection].sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
}

type FilingChange = { collection: CollectionRef; filed: boolean };

// Ticks show at once and roll back if the API refuses. One queue for every change:
// a quick tick and untick could otherwise reach the server in either order.
export function useFiling(linkId: string, initial: readonly CollectionRef[]) {
  const [filed, setFiled] = useState<CollectionRef[]>(() => [...initial]);
  const [problem, setProblem] = useState<string | null>(null);
  const mutation = useMutation({
    scope: { id: "filing" },
    mutationFn: ({ collection, filed: on }: FilingChange) =>
      api.request(`/collections/${collection.id}/links/${linkId}`, z.null(), { method: on ? "PUT" : "DELETE" }),
    onError: (_error, { collection, filed: on }) => {
      setFiled((current) => withCollection(current, collection, !on));
      setProblem(`Couldn't update ${displayName(collection.name)}. Try again.`);
    },
  });

  function setFiledIn(collection: CollectionRef, on: boolean) {
    setProblem(null);
    setFiled((current) => withCollection(current, collection, on));
    mutation.mutate({ collection, filed: on });
  }

  return { filed, setFiledIn, problem };
}
