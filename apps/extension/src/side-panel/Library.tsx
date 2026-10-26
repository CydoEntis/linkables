import type { ListedCollection } from "@linkables/shared/collections";
import { cn } from "cn";
import { Search } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { CollectionRows } from "./CollectionRows";
import { LinkRows } from "./LinkRows";
import { useDebounced } from "./use-debounced";

const TABS = [
  { id: "recent", label: "Recent" },
  { id: "pinned", label: "Pinned" },
  { id: "collections", label: "Collections" },
] as const;

type PanelTab = (typeof TABS)[number]["id"];

// Each keystroke would otherwise be a request.
const SEARCH_DELAY_MS = 250;

export function Library({ onShare }: { onShare: (collection: ListedCollection) => void }) {
  const [tab, setTab] = useState<PanelTab>("recent");
  const [query, setQuery] = useState("");
  const searched = useDebounced(query, SEARCH_DELAY_MS);
  const baseId = useId();
  const tabRefs = useRef(new Map<PanelTab, HTMLButtonElement>());

  // Arrow keys move between the tabs, as in any tab list.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;
    const index = TABS.findIndex((item) => item.id === tab);
    const next = TABS[(index + step + TABS.length) % TABS.length];
    if (!next) return;
    setTab(next.id);
    tabRefs.current.get(next.id)?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <div role="tablist" aria-label="Your links" onKeyDown={onKeyDown} className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {TABS.map((item) => (
          <button
            key={item.id}
            ref={(element) => {
              if (element) tabRefs.current.set(item.id, element);
            }}
            type="button"
            role="tab"
            id={`${baseId}-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab === item.id ? 0 : -1}
            onClick={() => { setTab(item.id); }}
            className={cn(
              "h-8 rounded-[9px] text-[12.5px] font-semibold",
              tab === item.id ? "bg-line-strong text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="flex h-9 items-center gap-2 rounded-[10px] bg-muted px-3 focus-within:outline-2 focus-within:outline-ring">
        <Search aria-hidden className="size-4 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => { setQuery(event.target.value); }}
          placeholder="Search your links"
          aria-label="Search your links"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[13px] outline-none focus-visible:outline-none"
        />
      </label>
      <div role="tabpanel" id={`${baseId}-panel`} aria-labelledby={`${baseId}-${tab}`} className="flex min-h-0 flex-col">
        {tab === "collections" ? <CollectionRows query={query} onShare={onShare} /> : <LinkRows tab={tab} query={searched.trim()} />}
      </div>
    </div>
  );
}
