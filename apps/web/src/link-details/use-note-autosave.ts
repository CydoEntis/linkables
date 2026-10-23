import { updateLinkRequestSchema, type SavedLink } from "@linkables/shared/links";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { saveAsPageLeaves, useUpdateLink } from "./use-update-link";

export const NOTE_SAVE_DELAY_MS = 500;

export type NoteStatus = "idle" | "saving" | "saved" | "invalid" | "failed";

const noteSchema = updateLinkRequestSchema.shape.note.unwrap().unwrap();

// The note saves itself shortly after typing stops, and at once when the field
// loses focus, the details close, or the page is hidden or unloaded.
// shortcut: a save as the page leaves can still be lost when no unexpired token
// is in memory (it must wait for one), or when the browser holds no CORS
// preflight for the link yet: Chrome drops a keepalive request that needs one.
// The link's first save, and any save in the API's preflight max-age, warm it.
export function useNoteAutosave(link: SavedLink) {
  const update = useUpdateLink(link.id);
  const queryClient = useQueryClient();
  const [value, setValue] = useState(link.note ?? "");
  const [invalid, setInvalid] = useState(false);
  const unsaved = useRef<string | null>(null);
  const lastSent = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const invalidRef = useRef(false);

  // The inline status covers the open field; a save flushed on close can only speak up in a toast.
  function send(text: string, keepalive = false) {
    const parsed = noteSchema.safeParse(text);
    invalidRef.current = !parsed.success;
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    lastSent.current = text;
    const edits = { note: parsed.data };
    const saved = keepalive ? saveAsPageLeaves(queryClient, link.id, edits) : update.mutateAsync({ edits });
    void saved.catch((error: unknown) => {
      if (!(error instanceof Error)) throw error;
      if (!mounted.current) toast.error("Couldn't save your note. Try again.");
    });
  }

  function flush(keepalive = false) {
    clearTimeout(timer.current);
    const text = unsaved.current;
    unsaved.current = null;
    if (text !== null) send(text, keepalive);
  }

  const mounted = useRef(true);
  const flushRef = useRef(flush);
  useEffect(() => { flushRef.current = flush; });
  useEffect(() => {
    mounted.current = true;
    const onHidden = () => { if (document.visibilityState === "hidden") flushRef.current(true); };
    const onPageHide = () => { flushRef.current(true); };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      mounted.current = false;
      flushRef.current();
      if (invalidRef.current) toast.error("Your note has characters that can't be saved, so it wasn't kept.");
    };
  }, []);

  function change(text: string) {
    setValue(text);
    unsaved.current = text;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, NOTE_SAVE_DELAY_MS);
  }

  function retry() {
    if (lastSent.current !== null) send(lastSent.current);
  }

  const status: NoteStatus = invalid ? "invalid" : update.isPending ? "saving" : update.isError ? "failed" : update.isSuccess ? "saved" : "idle";
  return { value, change, flush, retry, status };
}
