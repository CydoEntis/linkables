import { shareStateSchema, type ShareScopeRequest, type ShareState } from "@linkables/shared/sharing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../api/api";
import { groupsKeys } from "./use-groups";

// Under the collection's groups key, so every change to its groups refreshes the share scope too.
const scopeKey = (collectionId: string) => [...groupsKeys.collection(collectionId), "share-scope"] as const;
const mutationKey = (collectionId: string) => [...scopeKey(collectionId), "set"] as const;

export function useShareScope(collectionId: string) {
  return useQuery({
    queryKey: scopeKey(collectionId),
    queryFn: ({ signal }) => api.request(`/collections/${collectionId}/share`, shareStateSchema, { signal }),
  });
}

function requestOf({ ungrouped = true, groups = [] }: ShareState): ShareScopeRequest {
  return { ungrouped, groupIds: groups.filter((group) => group.shared).map((group) => group.id) };
}

type Save = { scope: ShareScopeRequest; previous: ShareState };

// Each tick saves at once: the box flips first and goes back if the save fails.
// change gets the latest state, ticks still in flight included, so quick ticks add up.
export function useChangeShareScope(collectionId: string): (change: (current: ShareState) => ShareState) => void {
  const queryClient = useQueryClient();
  const key = scopeKey(collectionId);
  const save = useMutation({
    mutationKey: mutationKey(collectionId),
    mutationFn: ({ scope }: Save) =>
      api.request(`/collections/${collectionId}/share/scope`, shareStateSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope),
      }),
    onError: (_error, { previous }) => {
      queryClient.setQueryData(key, previous);
      toast.error("Couldn't change what's shared. Try again.");
    },
    // Refetch once the last of a quick run of ticks has landed, so an older answer never overwrites a newer tick.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: mutationKey(collectionId) }) <= 1) {
        return queryClient.invalidateQueries({ queryKey: groupsKeys.collection(collectionId) });
      }
    },
  });
  return (change) => {
    const previous = queryClient.getQueryData<ShareState>(key);
    if (previous === undefined) return;
    const next = change(previous);
    queryClient.setQueryData(key, next);
    save.mutate({ scope: requestOf(next), previous });
  };
}
