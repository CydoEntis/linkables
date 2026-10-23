import { savedLinkSchema, type SavedLink } from "@linkables/shared/links";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../api/api";
import { linksKeys } from "./use-links";

// The handoff holds the list still after a pin so the row never re-sorts under the pointer.
export const PIN_HOLD_MS = 1500;

// The button shows the latest choice until the list catches up with it, so a
// refetch that lands between quick pin and unpin clicks cannot flip it back.
export function usePinLink(link: SavedLink) {
  const queryClient = useQueryClient();
  const [intent, setIntent] = useState<boolean | null>(null);
  const mutation = useMutation({
    scope: { id: `pin-${link.id}` },
    mutationFn: (pinned: boolean) =>
      api.request(`/links/${link.id}`, savedLinkSchema, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned }),
      }),
    onSuccess: () => {
      setTimeout(() => void queryClient.invalidateQueries({ queryKey: linksKeys.all }), PIN_HOLD_MS);
    },
    onError: () => {
      setIntent(null);
      toast.error("Couldn't pin the link. Try again.");
    },
  });

  if (intent !== null && intent === link.pinned && !mutation.isPending) setIntent(null);
  const pinned = intent ?? link.pinned;

  return {
    pinned,
    toggle: () => {
      setIntent(!pinned);
      mutation.mutate(!pinned);
    },
  };
}
