import { listGroupsResponseSchema } from "@linkables/shared/groups";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { api } from "../api/api";
import { PANEL_LISTS_KEY } from "../side-panel/queries";

export const groupsKey = (collectionId: string) => ["groups", collectionId] as const;

export function useGroups(collectionId: string, enabled = true) {
  return useQuery({
    queryKey: groupsKey(collectionId),
    enabled,
    queryFn: () => api.request(`/collections/${collectionId}/groups`, listGroupsResponseSchema),
    select: (data) => data.items,
  });
}

// null takes the link out of its group, back to the collection's ungrouped links.
export function useMoveToGroup(collectionId: string, linkId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string | null) =>
      api.request(`/collections/${collectionId}/links/${linkId}`, z.null(), { method: "PATCH", json: { groupId } }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: groupsKey(collectionId) }),
        queryClient.invalidateQueries({ queryKey: PANEL_LISTS_KEY }),
      ]),
  });
}
