import { savedLinkSchema, type SavedLink } from "@linkables/shared/links";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../api/api";
import { linksKeys } from "./use-links";

// The handoff holds the list still after a pin so the row never re-sorts under the pointer.
export const PIN_HOLD_MS = 1500;

export function usePinLink(link: SavedLink) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (pinned: boolean) =>
      api.request(`/links/${link.id}`, savedLinkSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      }),
    onSuccess: () => {
      setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: linksKeys.all }).then(() => { mutation.reset(); });
      }, PIN_HOLD_MS);
    },
    onError: () => { toast.error("Couldn't pin the link. Try again."); },
  });

  const pinned = mutation.isIdle || mutation.isError ? link.pinned : mutation.variables;
  return { pinned, toggle: () => { mutation.mutate(!pinned); } };
}
