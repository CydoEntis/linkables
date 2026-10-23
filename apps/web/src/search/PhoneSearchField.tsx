import { Search, X } from "lucide-react";
import { useRef, useState } from "react";
import { useSearchText } from "./use-search-text";

type PhoneSearchFieldProps = { query: string | undefined; onQueryChange: (query: string | undefined) => void };

// The phone's 48 px field only searches; saving has its own + button and sheet.
export function PhoneSearchField({ query, onQueryChange }: PhoneSearchFieldProps) {
  const [text, setText] = useState(query ?? "");
  const search = useSearchText({ query, onQueryChange, text, setText });
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        search.flush();
        inputRef.current?.blur();
      }}
    >
      <label className="flex h-12 items-center gap-2.5 rounded-xl bg-card pr-1.5 pl-3.5 shadow-[0_0_0_1px_var(--line-strong)] has-[input:focus-visible]:shadow-[0_0_0_2px_var(--ring)]">
        <Search aria-hidden strokeWidth={2.2} className="size-4 shrink-0 text-subtle-foreground" />
        <input
          ref={inputRef}
          value={text}
          onChange={(event) => { setText(event.target.value); }}
          onKeyDown={(event) => { if (event.key === "Escape") search.clear(); }}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          data-search-field
          placeholder="Search your links"
          aria-label="Search your links"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {text !== "" ? (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              search.clear();
              inputRef.current?.focus();
            }}
            className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground"
          >
            <X aria-hidden strokeWidth={2.2} className="size-4" />
          </button>
        ) : null}
      </label>
    </form>
  );
}
