import { savedLinkSchema, type SavedLink } from "@linkables/shared/links";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/api";

export type LinkUpdate = (update: (link: SavedLink) => SavedLink) => void;

// The pin shows at once and rolls back if the API refuses. A new initial value
// (fresh data from the server) replaces what is shown once no change is on its way.
export function usePin(linkId: string, initial: boolean, onSaved?: LinkUpdate) {
  const [pinned, setPinned] = useState(initial);
  const [shownInitial, setShownInitial] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const mutation = useMutation({
    scope: { id: "pin" },
    mutationFn: (on: boolean) => api.request(`/links/${linkId}`, savedLinkSchema, { method: "PATCH", json: { pinned: on } }),
    onSuccess: (link) => onSaved?.((current) => ({ ...current, pinned: link.pinned })),
    onError: (_error, on) => {
      setPinned(!on);
      setProblem(on ? "Couldn't pin this link. Try again." : "Couldn't unpin this link. Try again.");
    },
  });
  if (initial !== shownInitial && !mutation.isPending) {
    setShownInitial(initial);
    setPinned(initial);
  }

  function toggle() {
    const on = !pinned;
    setProblem(null);
    setPinned(on);
    mutation.mutate(on);
  }

  return { pinned, toggle, problem };
}
