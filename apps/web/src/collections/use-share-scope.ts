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

function withScope(state: ShareState, { ungrouped, groupIds }: ShareScopeRequest): ShareState {
  const chosen = new Set(groupIds);
  return { ...state, ungrouped, groups: state.groups?.map((group) => ({ ...group, shared: chosen.has(group.id) })) };
}

// Each tick saves at once: the box flips first and goes back if the save fails.
export function useSetShareScope(collectionId: string) {
  const queryClient = useQueryClient();
  const key = scopeKey(collectionId);
  return useMutation({
    mutationKey: mutationKey(collectionId),
    mutationFn: (scope: ShareScopeRequest) =>
      api.request(`/collections/${collectionId}/share/scope`, shareStateSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scope),
      }),
    onMutate: async (scope) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ShareState>(key);
      if (previous) queryClient.setQueryData<ShareState>(key, withScope(previous, scope));
      return { previous };
    },
    onError: (_error, _scope, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error("Couldn't change what's shared. Try again.");
    },
    // Refetch once the last of a quick run of ticks has landed, so an older answer never overwrites a newer tick.
    onSettled: () => {
      if (queryClient.isMutating({ mutationKey: mutationKey(collectionId) }) <= 1) {
        return queryClient.invalidateQueries({ queryKey: groupsKeys.collection(collectionId) });
      }
    },
  });
}
