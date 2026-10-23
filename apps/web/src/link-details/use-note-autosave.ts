import { updateLinkRequestSchema, type SavedLink } from "@linkables/shared/links";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useUpdateLink } from "./use-update-link";

export const NOTE_SAVE_DELAY_MS = 500;

export type NoteStatus = "idle" | "saving" | "saved" | "invalid" | "failed";

const noteSchema = updateLinkRequestSchema.shape.note.unwrap().unwrap();

// The note saves itself shortly after typing stops, and at once when the field
// loses focus or the details close, so no keystroke is lost.
export function useNoteAutosave(link: SavedLink) {
  const update = useUpdateLink(link.id);
  const [value, setValue] = useState(link.note ?? "");
  const [invalid, setInvalid] = useState(false);
  const unsaved = useRef<string | null>(null);
  const lastSent = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function send(text: string) {
    const parsed = noteSchema.safeParse(text);
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    lastSent.current = text;
    // Inline status covers the open field; a save flushed on close can only fail out loud.
    void update.mutateAsync({ note: parsed.data }).catch((error: unknown) => {
      if (!(error instanceof Error)) throw error;
      if (!mounted.current) toast.error("Couldn't save your note. Try again.");
    });
  }

  function flush() {
    clearTimeout(timer.current);
    const text = unsaved.current;
    unsaved.current = null;
    if (text !== null) send(text);
  }

  const mounted = useRef(true);
  const flushRef = useRef(flush);
  useEffect(() => { flushRef.current = flush; });
  useEffect(() => {
    mounted.current = true;
    return () => {
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
