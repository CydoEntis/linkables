import { LINK_SORTS, RESOURCE_KINDS, type LinkSort, type ResourceKind } from "@linkables/shared/links";
import { ArrowDownUp, ChevronDown, ListFilter, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { displayName } from "../collections/display-name";
import { useCollections } from "../collections/use-collections";
import type { ListScope } from "../links/use-links";
import { CLEARED_FILTERS, EARLIEST_DAY, filterChips, KIND_LABELS, SORT_LABELS, type FiltersChange, type ListFilters } from "./list-filters";

type FilterBarProps = { scope: ListScope; filters: ListFilters; onFiltersChange: FiltersChange };

const CONTROL =
  "flex h-11 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold text-soft-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted md:h-9";

// Pinned and collection filters are offered only where they can narrow the list:
// not on the Pinned view, and not on To sort, which has no filed links.
function offers(scope: ListScope, filters: ListFilters) {
  const view = "view" in scope && filters.q === undefined ? scope.view : null;
  return { pinned: view !== "pinned", collection: "view" in scope && view !== "inbox" };
}

export function FilterBar({ scope, filters, onFiltersChange }: FilterBarProps) {
  const collections = useCollections();
  const nameOf = (id: string) => {
    const found = collections.data?.find((collection) => collection.id === id);
    return found && displayName(found.name);
  };
  const chips = filterChips(filters, nameOf);

  return (
    <div className="mb-2 flex flex-wrap items-center gap-x-1 gap-y-1.5 px-1 md:mb-3 md:-ml-3.5 md:px-0">
      <SortMenu sort={filters.sort ?? "newest"} onSortChange={(sort) => { onFiltersChange({ sort: sort === "newest" ? undefined : sort }); }} />
      <FilterPopover filters={filters} offers={offers(scope, filters)} onFiltersChange={onFiltersChange} />
      {chips.length > 0 ? (
        <ul aria-label="Active filters" className="contents">
          {chips.map((chip) => (
            <li key={chip.key} className="flex">
              <button
                type="button"
                aria-label={`Remove filter: ${chip.label}`}
                onClick={() => { onFiltersChange(chip.clear); }}
                className="group flex h-11 max-w-full items-center md:h-9"
              >
                <span className="flex h-8 min-w-0 items-center gap-1.5 rounded-full bg-foreground pr-2 pl-3 text-[13px] font-semibold text-background">
                  <span className="truncate">{chip.label}</span>
                  <X aria-hidden strokeWidth={2.6} className="size-3.5 shrink-0 opacity-70 group-hover:opacity-100" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {chips.length > 0 ? (
        <button type="button" onClick={() => { onFiltersChange(CLEARED_FILTERS); }} className="h-11 rounded-full px-2.5 text-[13px] font-semibold text-muted-foreground hover:text-foreground md:h-9">
          Clear all
        </button>
      ) : null}
    </div>
  );
}

function SortMenu({ sort, onSortChange }: { sort: LinkSort; onSortChange: (sort: LinkSort) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger aria-label={`Sort: ${SORT_LABELS[sort]}`} className={CONTROL}>
        <ArrowDownUp aria-hidden strokeWidth={2.2} className="size-3.5" />
        {SORT_LABELS[sort]}
        <ChevronDown aria-hidden strokeWidth={2.4} className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-44">
        <DropdownMenuRadioGroup value={sort} onValueChange={(value: LinkSort) => { onSortChange(value); }}>
          {LINK_SORTS.map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {SORT_LABELS[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type FilterPopoverProps = {
  filters: ListFilters;
  offers: { pinned: boolean; collection: boolean };
  onFiltersChange: FiltersChange;
};

function FilterPopover({ filters, offers: offered, onFiltersChange }: FilterPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger className={CONTROL}>
        <ListFilter aria-hidden strokeWidth={2.2} className="size-3.5" />
        Filter
      </PopoverTrigger>
      <PopoverContent align="start" className="flex w-[min(320px,calc(100vw-32px))] flex-col gap-4 p-4">
        <PopoverTitle className="sr-only">Filter</PopoverTitle>
        <KindChoice kind={filters.kind} onKindChange={(kind) => { onFiltersChange({ kind }); }} />
        {offered.pinned ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              checked={filters.pinned === true}
              onChange={(event) => { onFiltersChange({ pinned: event.target.checked || undefined }); }}
              className="size-[18px] accent-primary"
            />
            Pinned only
          </label>
        ) : null}
        <DateRange from={filters.from} to={filters.to} onRangeChange={(range) => { onFiltersChange(range, { replace: true }); }} />
        {offered.collection ? (
          <CollectionChoice collection={filters.collection} onCollectionChange={(collection) => { onFiltersChange({ collection }); }} />
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-semibold tracking-[0.02em] text-subtle-foreground">{legend}</legend>
      {children}
    </fieldset>
  );
}

const KIND_OPTIONS: (ResourceKind | undefined)[] = [undefined, ...RESOURCE_KINDS];

function KindChoice({ kind, onKindChange }: { kind: ResourceKind | undefined; onKindChange: (kind: ResourceKind | undefined) => void }) {
  const name = useId();
  return (
    <Group legend="Kind">
      <div className="flex flex-wrap gap-1.5">
        {KIND_OPTIONS.map((option) => (
          <label
            key={option ?? "any"}
            className={cn(
              "relative flex h-9 items-center rounded-full px-3.5 text-[13px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring",
              kind === option ? "bg-foreground text-background" : "bg-muted text-soft-foreground hover:bg-accent",
            )}
          >
            {option === undefined ? "Any" : KIND_LABELS[option]}
            <input
              type="radio"
              name={name}
              checked={kind === option}
              onChange={() => { onKindChange(option); }}
              className="absolute inset-0 cursor-pointer appearance-none rounded-full outline-none"
            />
          </label>
        ))}
      </div>
    </Group>
  );
}

type Range = { from: string | undefined; to: string | undefined };

const DATE_INPUT =
  "h-11 w-full min-w-0 rounded-lg bg-muted px-2 text-[13px] outline-none [color-scheme:dark] focus-visible:outline-2 focus-visible:outline-ring aria-invalid:shadow-[0_0_0_1.5px_var(--destructive)]";

// A reversed range is held back with a message instead of reaching the URL.
function DateRange({ from, to, onRangeChange }: Range & { onRangeChange: (range: Range) => void }) {
  const [draft, setDraft] = useState({ from: from ?? "", to: to ?? "" });
  const errorId = useId();
  const reversed = draft.from !== "" && draft.to !== "" && draft.from > draft.to;

  function change(next: typeof draft) {
    setDraft(next);
    // A year still being typed reads as 0002, 0020…: wait until the day is a real one.
    if ([next.from, next.to].some((day) => day !== "" && day < EARLIEST_DAY)) return;
    if (next.from !== "" && next.to !== "" && next.from > next.to) return;
    onRangeChange({ from: next.from || undefined, to: next.to || undefined });
  }

  return (
    <Group legend="Saved between">
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          aria-label="From"
          min={EARLIEST_DAY}
          value={draft.from}
          onChange={(event) => { change({ ...draft, from: event.target.value }); }}
          aria-invalid={reversed || undefined}
          aria-describedby={reversed ? errorId : undefined}
          className={DATE_INPUT}
        />
        <input
          type="date"
          aria-label="To"
          min={EARLIEST_DAY}
          value={draft.to}
          onChange={(event) => { change({ ...draft, to: event.target.value }); }}
          aria-invalid={reversed || undefined}
          aria-describedby={reversed ? errorId : undefined}
          className={DATE_INPUT}
        />
      </div>
      {reversed ? (
        <p id={errorId} role="alert" className="text-[13px] text-destructive">
          The first date is after the second.
        </p>
      ) : null}
    </Group>
  );
}

function CollectionChoice({ collection, onCollectionChange }: { collection: string | undefined; onCollectionChange: (id: string | undefined) => void }) {
  const collections = useCollections();
  const id = useId();
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-semibold tracking-[0.02em] text-subtle-foreground">
        Collection
      </label>
      <select
        id={id}
        value={collection ?? ""}
        onChange={(event) => { onCollectionChange(event.target.value || undefined); }}
        className="h-11 rounded-lg bg-muted px-2.5 text-sm outline-none focus-visible:outline-2 focus-visible:outline-ring"
      >
        <option value="">Any collection</option>
        {(collections.data ?? []).map((item) => (
          <option key={item.id} value={item.id}>
            {displayName(item.name)}
          </option>
        ))}
      </select>
    </div>
  );
}
