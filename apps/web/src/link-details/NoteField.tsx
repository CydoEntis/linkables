import { NOTE_MAX, type SavedLink } from "@linkables/shared/links";
import { useId } from "react";
import { useNoteAutosave, type NoteStatus } from "./use-note-autosave";

const QUIET: Partial<Record<NoteStatus, string>> = { saving: "Saving…", saved: "Saved" };

export function NoteField({ link }: { link: SavedLink }) {
  const note = useNoteAutosave(link);
  const id = useId();
  const problemId = `${id}-problem`;
  const problem = note.status === "invalid" || note.status === "failed";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-xs font-semibold text-muted-foreground">
          Note
        </label>
        {/* Present from the start so screen readers hear "Saved" without focus moving. */}
        <span role="status" className="text-xs text-subtle-foreground">
          {QUIET[note.status] ?? ""}
        </span>
      </div>
      <textarea
        id={id}
        value={note.value}
        maxLength={NOTE_MAX}
        placeholder="Add a note for yourself"
        aria-invalid={problem || undefined}
        aria-describedby={problem ? problemId : undefined}
        onChange={(event) => { note.change(event.target.value); }}
        onBlur={() => { note.flush(); }}
        className="min-h-[84px] resize-y rounded-lg bg-muted px-3.5 py-3 text-sm leading-normal outline-none placeholder:text-subtle-foreground focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:outline-destructive"
      />
      {problem ? (
        <p id={problemId} role="alert" className="flex items-center justify-between gap-2 text-[13px] text-destructive">
          {note.status === "invalid" ? "Your note has characters that can't be saved." : "Couldn't save your note."}
          {note.status === "failed" ? (
            <button type="button" onClick={note.retry} className="min-h-8 rounded-md px-2 font-semibold max-md:min-h-11 text-foreground hover:bg-muted">
              Try again
            </button>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
