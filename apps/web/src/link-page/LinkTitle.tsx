import { zodResolver } from "@hookform/resolvers/zod";
import type { SavedLink } from "@linkables/shared/links";
import { useId, useRef, useState, type Ref } from "react";
import { useForm } from "react-hook-form";
import { cn } from "cn";
import { displayTitle } from "../links/link-display";
import { titleFormSchema, type TitleFormInput, type TitleFormOutput } from "./title-form";
import { useUpdateLink } from "./use-update-link";

const TITLE = "text-[26px] leading-[1.15] font-bold tracking-[-0.02em] wrap-anywhere md:text-[34px]";

// Click the title to rename the link: Enter or leaving the field saves, Esc
// cancels, and a blank title brings back the fetched one.
export function LinkTitle({ link, titleRef }: { link: SavedLink; titleRef: Ref<HTMLHeadingElement> }) {
  const [editing, setEditing] = useState(false);
  const refocus = useRef(false);
  const title = displayTitle(link);
  const done = () => {
    refocus.current = true;
    setEditing(false);
  };
  // Enter or Esc removes the field with focus in it; focus goes back to the
  // title, unless leaving the field already took it somewhere else.
  const returnFocus = (button: HTMLButtonElement | null) => {
    if (button === null || !refocus.current) return;
    refocus.current = false;
    if (document.activeElement === null || document.activeElement === document.body) button.focus();
  };
  if (editing) return <TitleForm link={link} onDone={done} />;
  return (
    <h1 ref={titleRef} tabIndex={-1} className={cn(TITLE, "outline-none")}>
      <button
        ref={returnFocus}
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
    </h1>
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
