import { Search, X } from "lucide-react";
import { useId, type KeyboardEvent } from "react";
import { cn } from "cn";
import { useSearchText } from "../search/use-search-text";
import { saveLinkFormSchema } from "./save-link-form";
import { useSaveLinkForm } from "./use-save-link-form";

type SaveBarProps = {
  className?: string;
  query: string | undefined;
  onQueryChange: (query: string | undefined) => void;
};

const isLink = (text: string) => saveLinkFormSchema.safeParse({ url: text }).success;

// A link is offered for saving, never searched for, as in the handoff.
const searchFor = (text: string) => (isLink(text) ? undefined : text.trim() || undefined);

// The handoff's search/paste bar: a link gets the lime Save button, anything else searches as you type.
export function SaveBar({ className, query, onQueryChange }: SaveBarProps) {
  const { register, onSubmit, value, setValue, clearError, canSave, error } = useSaveLinkForm({ reValidateMode: "onSubmit" });
  const search = useSearchText({ query, onQueryChange, text: value, setText: setValue, toQuery: searchFor });
  const field = register("url", { onChange: clearError });
  const errorId = useId();
  const searching = !canSave && value.trim() !== "";

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Escape") return;
    if (value === "") event.currentTarget.blur();
    else search.clear();
  }

  return (
    <form
      noValidate
      role="search"
      onSubmit={(event) => {
        if (canSave) onSubmit(event);
        else {
          event.preventDefault();
          search.flush();
        }
      }}
      className={className}
    >
      <label
        className={cn(
          "flex h-[52px] cursor-text items-center gap-3 rounded-xl bg-card pr-2 pl-[18px] shadow-[0_0_0_1px_var(--line-strong)] transition-shadow duration-200",
          "has-[input:focus-visible]:shadow-[0_0_0_2px_var(--ring)]",
          canSave && "shadow-[0_0_0_1.5px_var(--ring),0_0_0_6px_var(--primary-soft)]",
          error && "shadow-[0_0_0_1.5px_var(--destructive)] has-[input:focus-visible]:shadow-[0_0_0_2px_var(--destructive)]",
        )}
      >
        <Search aria-hidden strokeWidth={2.2} className="size-[17px] shrink-0 text-subtle-foreground" />
        <input
          {...field}
          type="text"
          inputMode="url"
          autoComplete="off"
          autoFocus
          data-search-field
          onKeyDown={onKeyDown}
          placeholder="Search or paste a link"
          aria-label="Search or paste a link"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        {canSave ? (
          <button
            type="submit"
            className="h-[38px] shrink-0 animate-pop rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground"
          >
            Save link
          </button>
        ) : null}
        {searching ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={(event) => {
              search.clear();
              event.currentTarget.form?.querySelector<HTMLInputElement>("[data-search-field]")?.focus();
            }}
            className="flex size-[34px] shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden strokeWidth={2.2} className="size-4" />
          </button>
        ) : null}
      </label>
      {error ? (
        <p id={errorId} role="alert" className="px-1 pt-2 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
