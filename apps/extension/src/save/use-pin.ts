import { savedLinkSchema } from "@linkables/shared/links";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../api/api";

// The pin shows at once and rolls back if the API refuses.
export function usePin(linkId: string, initial: boolean) {
  const [pinned, setPinned] = useState(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const mutation = useMutation({
    scope: { id: "pin" },
    mutationFn: (on: boolean) => api.request(`/links/${linkId}`, savedLinkSchema, { method: "PATCH", json: { pinned: on } }),
    onError: (_error, on) => {
      setPinned(!on);
      setProblem(on ? "Couldn't pin this link. Try again." : "Couldn't unpin this link. Try again.");
    },
  });

  function toggle() {
    const on = !pinned;
    setProblem(null);
    setPinned(on);
    mutation.mutate(on);
  }

  return { pinned, toggle, problem };
}
