import { SEARCH_QUERY_MAX_LENGTH } from "@linkables/shared/links";
import { Search, X } from "lucide-react";
import { useId, type KeyboardEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { modKeyLabel } from "../search/shortcut-keys";
import { useSearchText } from "../search/use-search-text";
import { saveLinkFormSchema } from "./save-link-form";
import { useSaveLinkForm } from "./use-save-link-form";

type SaveBarProps = {
  className?: string;
  query: string | undefined;
  onQueryChange: (query: string | undefined) => void;
};

const isLink = (text: string) => saveLinkFormSchema.safeParse({ url: text }).success;

// The API takes searches up to this length; the bar itself also takes long links.
const searchText = (text: string) => text.trim().slice(0, SEARCH_QUERY_MAX_LENGTH).trim() || undefined;

// The handoff's search/paste bar: a link gets the lime Save button, anything else searches as you type.
export function SaveBar({ className, query, onQueryChange }: SaveBarProps) {
  const form = useSaveLinkForm({ reValidateMode: "onSubmit", defaultUrl: query });
  const { register, onSubmit, value, setValue, clearError, error } = form;
  // Typed text that is a link is offered for saving, never searched for, as in
  // the handoff; a search that came from the URL stays a search even when it looks like a link.
  const fromUrl = query !== undefined && value.trim() === query;
  const canSave = form.canSave && !fromUrl;
  const toQuery = (text: string) => (text.trim() === query ? query : isLink(text) ? undefined : searchText(text));
  const search = useSearchText({ query, onQueryChange, text: value, setText: setValue, toQuery });
  const field = register("url", { onChange: clearError });
  const errorId = useId();
  const searching = !canSave && value.trim() !== "";
  const clipped = searching && value.trim().length > SEARCH_QUERY_MAX_LENGTH;

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
          data-save-field
          onKeyDown={onKeyDown}
          placeholder="Search or paste a link"
          aria-label="Search or paste a link"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none"
        />
        {canSave ? (
          <Button type="submit" className="h-[38px] animate-pop px-4">
            Save link
          </Button>
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
        {value === "" ? (
          <kbd aria-hidden className="mr-1.5 shrink-0 rounded-md px-2 py-[3px] font-mono text-[11px] font-medium text-subtle-foreground shadow-[inset_0_0_0_1px_var(--line-strong)]">
            {modKeyLabel()}K
          </kbd>
        ) : null}
      </label>
      {clipped ? <p className="px-1 pt-2 text-[13px] text-muted-foreground">Searches use the first {SEARCH_QUERY_MAX_LENGTH} characters.</p> : null}
      {error ? (
        <p id={errorId} role="alert" className="px-1 pt-2 text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
