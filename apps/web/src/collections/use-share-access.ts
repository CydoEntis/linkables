import { shareAccessSchema, type ShareAccess } from "@linkables/shared/sharing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";

const accessKey = (collectionId: string) => ["share", "access", collectionId] as const;

// Read when the dialog opens, so a list changed on another device is never overwritten from a stale copy.
export function useShareAccess(collectionId: string, enabled: boolean) {
  return useQuery({
    queryKey: accessKey(collectionId),
    enabled,
    gcTime: 0,
    queryFn: ({ signal }) => api.request(`/collections/${collectionId}/share/access`, shareAccessSchema, { signal }),
  });
}

export function useSetShareAccess(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (access: ShareAccess) =>
      api.request(`/collections/${collectionId}/share/access`, shareAccessSchema, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(access),
      }),
    onSuccess: (saved) => { queryClient.setQueryData(accessKey(collectionId), saved); },
  });
}
