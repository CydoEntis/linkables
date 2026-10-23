import { zodResolver } from "@hookform/resolvers/zod";
import type { SavedLink } from "@linkables/shared/links";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { cn } from "cn";
import { displayTitle } from "../links/link-display";
import { titleFormSchema, type TitleFormInput, type TitleFormOutput } from "./title-form";
import { useUpdateLink } from "./use-update-link";

const TITLE = "text-[21px] leading-[1.25] font-bold tracking-[-0.01em] wrap-anywhere";

// Click the title to rename the link: Enter or leaving the field saves, Esc
// cancels, and a blank title brings back the fetched one.
export function DetailsTitle({ link }: { link: SavedLink }) {
  const [editing, setEditing] = useState(false);
  const title = displayTitle(link);
  if (editing) return <TitleForm link={link} onDone={() => { setEditing(false); }} />;
  return (
    <h2 className={TITLE}>
      <button
        type="button"
        title="Rename"
        onClick={() => { setEditing(true); }}
        className={cn(
          // On phones the hit area reaches 44 px above and below the text without moving it.
          "relative -mx-1.5 cursor-text rounded-md px-1.5 text-left hover:bg-muted max-md:after:absolute max-md:after:inset-x-0 max-md:after:-inset-y-[9px]",
          title.isUrl && "text-muted-foreground",
        )}
      >
        {title.text}
        <span className="sr-only">, rename</span>
      </button>
    </h2>
  );
}

function TitleForm({ link, onDone }: { link: SavedLink; onDone: () => void }) {
  const update = useUpdateLink(link.id);
  const errorId = useId();
  const form = useForm<TitleFormInput, unknown, TitleFormOutput>({
    resolver: zodResolver(titleFormSchema),
    defaultValues: { title: link.titleOverride ?? link.resource.title ?? "" },
  });
  const error = form.formState.errors.title?.message;

  const submit = form.handleSubmit(async ({ title }) => {
    // Nothing changed; and saving the fetched title unchanged would freeze it as an override.
    if (title === link.titleOverride || title === (link.titleOverride ?? link.resource.title)) {
      onDone();
      return;
    }
    try {
      await update.mutateAsync({ edits: { titleOverride: title } });
      onDone();
    } catch (failure) {
      if (!(failure instanceof Error)) throw failure;
      form.setError("title", { message: "Couldn't save the title. Try again." });
    }
  });
  const field = form.register("title");

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="flex min-w-0 flex-col gap-1"
    >
      <input
        {...field}
        autoFocus
        autoComplete="off"
        aria-label="Title"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onFocus={(event) => { event.currentTarget.select(); }}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          event.stopPropagation();
          onDone();
        }}
        onBlur={(event) => {
          void field.onBlur(event);
          if (!form.formState.isSubmitting) void submit();
        }}
        className={`${TITLE} -mx-1.5 w-full min-w-0 rounded-md bg-muted px-1.5 outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:outline-destructive`}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
