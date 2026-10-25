import {
  ownSharedCollectionsResponseSchema,
  sharedCollectionSchema,
  shareStateSchema,
  type OwnSharedCollectionsResponse,
} from "@linkables/shared/sharing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";
import { SHARED_PATH_PREFIX } from "./path";

const shareKeys = {
  own: ["share", "own"] as const,
  shared: (token: string) => ["shared", token] as const,
};

export function sharedUrl(token: string): string {
  return `${window.location.origin}${SHARED_PATH_PREFIX}${token}`;
}

// The shared address without its scheme, as the sharing menu shows it.
export function sharedPrefix(): string {
  return `${window.location.host}${SHARED_PATH_PREFIX}`;
}

function fetchOwnShared({ signal }: { signal: AbortSignal }) {
  return api.request("/collections/shared", ownSharedCollectionsResponseSchema, { signal });
}

// The signed-in user's collections whose link is on, for Settings.
export function useOwnShared() {
  return useQuery({
    queryKey: shareKeys.own,
    queryFn: fetchOwnShared,
    select: (data) => data.items,
  });
}

const NONE: ReadonlySet<string> = new Set();

function idsOf(data: OwnSharedCollectionsResponse): ReadonlySet<string> {
  return new Set(data.items.map((item) => item.id));
}

// Which of the signed-in user's collections have their link on, for the globe marks.
export function useSharedIds(): ReadonlySet<string> {
  return useQuery({ queryKey: shareKeys.own, queryFn: fetchOwnShared, select: idsOf }).data ?? NONE;
}

// The collection's share token while its link is on, for the header's Copy link.
export function useShareToken(collectionId: string): string | undefined {
  return useQuery({
    queryKey: shareKeys.own,
    queryFn: fetchOwnShared,
    select: (data) => data.items.find((item) => item.id === collectionId)?.token,
  }).data;
}

// POST turns the link on (keeping one that is already on); DELETE turns it off.
export function useSetSharing(collectionId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (on: boolean) =>
      api.request(`/collections/${collectionId}/share`, shareStateSchema, { method: on ? "POST" : "DELETE" }),
    // Not awaited: the header swaps controls once the list refetches, and that
    // must not unmount the caller before its own onSuccess runs.
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: shareKeys.own }); },
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
