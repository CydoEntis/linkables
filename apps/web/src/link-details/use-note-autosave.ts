import { updateLinkRequestSchema, type SavedLink } from "@linkables/shared/links";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useUpdateLink } from "./use-update-link";

export const NOTE_SAVE_DELAY_MS = 500;

export type NoteStatus = "idle" | "saving" | "saved" | "invalid" | "failed";

const noteSchema = updateLinkRequestSchema.shape.note.unwrap().unwrap();

// The note saves itself shortly after typing stops, and at once when the field
// loses focus, the details close, or the page is hidden or unloaded.
// shortcut: a save that waits behind an earlier one still in flight, or that
// needs a token refresh, may not leave a closing page in time.
export function useNoteAutosave(link: SavedLink) {
  const update = useUpdateLink(link.id);
  const [value, setValue] = useState(link.note ?? "");
  const [invalid, setInvalid] = useState(false);
  const unsaved = useRef<string | null>(null);
  const lastSent = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The inline status covers the open field; a save flushed on close can only speak up in a toast.
  function send(text: string, keepalive = false) {
    const parsed = noteSchema.safeParse(text);
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    lastSent.current = text;
    void update.mutateAsync({ edits: { note: parsed.data }, keepalive }).catch((error: unknown) => {
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
