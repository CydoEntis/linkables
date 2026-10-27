import { shareStateSchema, type ShareState } from "@linkables/shared/sharing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/api";
import { groupsKey } from "../collections/use-groups";
import { scopeRequest } from "./share-scope";

// Under the collection's groups key, so a change to its groups refreshes the scope too.
const scopeKey = (collectionId: string) => [...groupsKey(collectionId), "share-scope"] as const;
const mutationKey = (collectionId: string) => [...scopeKey(collectionId), "set"] as const;

export function useShareScope(collectionId: string) {
  return useQuery({
    queryKey: scopeKey(collectionId),
    queryFn: () => api.request(`/collections/${collectionId}/share`, shareStateSchema),
  });
}

// Each tick saves at once: the box flips first and goes back if the save fails.
// change gets the latest state, ticks still in flight included, so quick ticks add up.
export function useChangeShareScope(collectionId: string) {
  const queryClient = useQueryClient();
  const key = scopeKey(collectionId);
  const [problem, setProblem] = useState(false);
  const save = useMutation({
    mutationKey: mutationKey(collectionId),
    mutationFn: ({ next }: { next: ShareState; previous: ShareState }) =>
      api.request(`/collections/${collectionId}/share/scope`, shareStateSchema, { method: "PUT", json: scopeRequest(next) }),
    onError: (_error, { previous }) => {
      queryClient.setQueryData(key, previous);
      setProblem(true);
    },
    // Refetch once the last of a quick run of ticks has landed, so an older answer never overwrites a newer tick.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: mutationKey(collectionId) }) <= 1) {
        return queryClient.invalidateQueries({ queryKey: groupsKey(collectionId) });
      }
    },
  });

  function change(update: (current: ShareState) => ShareState) {
    const previous = queryClient.getQueryData<ShareState>(key);
    if (previous === undefined) return;
    const next = update(previous);
    setProblem(false);
    queryClient.setQueryData(key, next);
    save.mutate({ next, previous });
  }

  return { change, problem };
}
