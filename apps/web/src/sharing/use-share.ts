import { sharedCollectionSchema, shareStateSchema, type ShareState } from "@linkables/shared/sharing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";
import { SHARED_PATH_PREFIX } from "./path";

const shareKeys = {
  state: (collectionId: string) => ["share", collectionId] as const,
  shared: (token: string) => ["shared", token] as const,
};

export function sharedUrl(token: string): string {
  return `${window.location.origin}${SHARED_PATH_PREFIX}${token}`;
}

export function useShareState(collectionId: string, enabled: boolean) {
  return useQuery({
    queryKey: shareKeys.state(collectionId),
    queryFn: ({ signal }) => api.request(`/collections/${collectionId}/share`, shareStateSchema, { signal }),
    enabled,
  });
}

// POST turns the link on (keeping one that is already on); DELETE turns it off.
export function useSetSharing(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (on: boolean) =>
      api.request(`/collections/${collectionId}/share`, shareStateSchema, { method: on ? "POST" : "DELETE" }),
    onSuccess: (state: ShareState) => { queryClient.setQueryData(shareKeys.state(collectionId), state); },
  });
}

export function useSharedCollection(token: string) {
  return useQuery({
    queryKey: shareKeys.shared(token),
    queryFn: ({ signal }) => api.request(`/shared/${encodeURIComponent(token)}`, sharedCollectionSchema, { signal }),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
