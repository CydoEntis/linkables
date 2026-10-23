import type { SaveLinkResponse } from "@linkables/shared/links";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { api } from "../api/api";
import { saveProblem } from "../links/save-link-form";
import { useSaveLinkMutation } from "../links/use-save-link";
import { linksKeys } from "../links/use-links";
import { clearPendingSave } from "./pending-save";

export type SharedSave =
  | { status: "no-link" }
  | { status: "saving"; url: string }
  | { status: "saved"; link: SaveLinkResponse }
  | { status: "error"; message: string }
  | { status: "removed" };

const SAVE_FAILED = "Couldn't save the link. Try again.";

function useUndoSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => api.request(`/links/${linkId}`, z.null(), { method: "DELETE" }),
    onError: () => toast.error("Couldn't undo. Try again."),
    onSettled: () => queryClient.invalidateQueries({ queryKey: linksKeys.all }),
  });
}

// Saves on page load: one tap in the share sheet is the whole point. A hostile
// page can at worst add one link to the user's own list, which Undo removes.
export function useSharedSave(sharedUrl: string | null) {
  const [url, setUrl] = useState(sharedUrl);
  const save = useSaveLinkMutation();
  const undo = useUndoSave();
  const started = useRef(false);
  const { mutate } = save;

  useEffect(() => {
    clearPendingSave();
    // StrictMode runs effects twice; a second POST would come back as a duplicate.
    if (started.current || sharedUrl === null) return;
    started.current = true;
    mutate(sharedUrl);
  }, [mutate, sharedUrl]);

  function saveUrl(next: string) {
    setUrl(next);
    mutate(next);
  }

  const state = sharedSaveState(url, save, undo.isSuccess);
  return {
    state,
    saveUrl,
    retry: () => { if (url !== null) mutate(url); },
    // A duplicate was already in the list before this visit, so Undo must not delete it.
    undo: state.status === "saved" && !state.link.duplicate ? () => { undo.mutate(state.link.id); } : undefined,
    undoing: undo.isPending,
  };
}

type SaveMutation = ReturnType<typeof useSaveLinkMutation>;

function sharedSaveState(url: string | null, save: SaveMutation, removed: boolean): SharedSave {
  if (removed) return { status: "removed" };
  if (url === null) return { status: "no-link" };
  if (save.isSuccess) return { status: "saved", link: save.data };
  if (save.isError) {
    const problem = saveProblem(save.error);
    return { status: "error", message: problem.kind === "none" ? SAVE_FAILED : problem.message };
  }
  return { status: "saving", url };
}
