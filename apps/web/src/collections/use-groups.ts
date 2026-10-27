import { groupSchema, listGroupsResponseSchema, type Group, type ListGroupsResponse } from "@linkables/shared/groups";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../api/api";
import { linksKeys } from "../links/use-links";

export const groupsKeys = {
  all: ["groups"] as const,
  collection: (collectionId: string) => ["groups", collectionId] as const,
};

const JSON_HEADERS = { "Content-Type": "application/json" };

export function useGroups(collectionId: string) {
  return useQuery({
    queryKey: groupsKeys.collection(collectionId),
    queryFn: ({ signal }) => api.request(`/collections/${collectionId}/groups`, listGroupsResponseSchema, { signal }),
    select: (data: ListGroupsResponse): Group[] => data.items,
  });
}

// Every group count on the page comes from here, so anything that changes which links a collection
// holds (filing, unfiling, deleting a link) calls this next to its collections refresh.
export function invalidateGroups(queryClient: QueryClient, options: { refetchType?: "none" } = {}) {
  return queryClient.invalidateQueries({ queryKey: groupsKeys.all, ...options });
}

// Counts and a section's links both come from the server, so a change that moves links refreshes both.
export function refreshGroups(queryClient: QueryClient, collectionId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: groupsKeys.collection(collectionId) }),
    queryClient.invalidateQueries({ queryKey: linksKeys.collection(collectionId) }),
  ]);
}

export function useCreateGroup(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.request(`/collections/${collectionId}/groups`, groupSchema, {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => refreshGroups(queryClient, collectionId),
  });
}

export function useRenameGroup(collectionId: string, groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.request(`/collections/${collectionId}/groups/${groupId}`, groupSchema, {
        method: "PATCH",
        headers: JSON_HEADERS,
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsKeys.collection(collectionId) }),
  });
}

export function useDeleteGroup(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) =>
      api.request(`/collections/${collectionId}/groups/${groupId}`, z.null(), { method: "DELETE" }),
    onSuccess: () => refreshGroups(queryClient, collectionId),
  });
}

// The new order shows at once; the server's answer replaces it.
export function useReorderGroups(collectionId: string) {
  const queryClient = useQueryClient();
  const key = groupsKeys.collection(collectionId);
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.request(`/collections/${collectionId}/groups/order`, listGroupsResponseSchema, {
        method: "PUT",
        headers: JSON_HEADERS,
        body: JSON.stringify({ ids }),
      }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key });
      queryClient.setQueryData<ListGroupsResponse>(key, (data) =>
        data && { items: ids.flatMap((id) => data.items.filter((group) => group.id === id)) },
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
