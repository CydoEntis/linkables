import { isApiError } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import {
  ownSharedCollectionsResponseSchema,
  sharedCollectionSchema,
  shareStateSchema,
  VIEWER_SESSION_HEADER,
  type OwnSharedCollectionsResponse,
} from "@linkables/shared/sharing";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/api";
import { SHARED_PATH_PREFIX } from "./path";
import { forgetViewerSession, viewerSessionFor } from "./viewer-session";

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
    onSuccess: (_state, on) => {
      // A link turned off is dead at once, so nothing may offer to copy it while the list refetches.
      if (!on) queryClient.setQueryData<OwnSharedCollectionsResponse>(shareKeys.own, (data) => data && { items: data.items.filter((item) => item.id !== collectionId) });
      // Not awaited, so the caller's own onSuccess runs before its row or control unmounts.
      void queryClient.invalidateQueries({ queryKey: shareKeys.own });
    },
  });
}

export const sharedKey = shareKeys.shared;

// A private share needs the session a viewer earns with an emailed code; one the API no longer accepts is dropped.
async function fetchShared(token: string, signal: AbortSignal) {
  const session = viewerSessionFor(token);
  const headers: Record<string, string> = session === undefined ? {} : { [VIEWER_SESSION_HEADER]: session };
  try {
    return await api.request(`/shared/${encodeURIComponent(token)}`, sharedCollectionSchema, { signal, headers });
  } catch (error) {
    if (session !== undefined && isApiError(error, ERROR_CODES.FORBIDDEN)) forgetViewerSession(token);
    throw error;
  }
}

export function useSharedCollection(token: string) {
  return useQuery({
    queryKey: shareKeys.shared(token),
    queryFn: ({ signal }) => fetchShared(token, signal),
    retry: false,
    refetchOnWindowFocus: false,
  });
}
