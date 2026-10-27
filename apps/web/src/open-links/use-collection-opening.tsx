import type { ListedCollection } from "@linkables/shared/collections";
import { CheckSquare, ExternalLink, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import type { ListFilters } from "../search/list-filters";
import { SelectionBar } from "./SelectionBar";
import { useSelection } from "./selection-store";
import { useAllCollectionLinks } from "./use-all-collection-links";
import { useOpenLinks } from "./use-open-links";

// Phones drop the icons so Open all, Select, Share and Delete fit one row.
const HEADER_BUTTON = "px-3 font-bold md:h-10 md:px-4 max-md:[&_svg]:hidden";

// The collection header's Open all and Select, and what they bring up: the
// selection bar, the confirm and the blocked pop-ups banner.
export function useCollectionOpening(collection: ListedCollection, filters: ListFilters): { actions: ReactNode; extras: ReactNode } {
  const opening = useOpenLinks();
  const all = useAllCollectionLinks(collection.id);
  const selecting = useSelection((state) => state.selecting);
  const { start, cancel, chooseAll, drop } = useSelection.getState();
  const [loading, setLoading] = useState<"open" | "select" | null>(null);
  // Stringified so an equal filter object from a new render does not count as a change.
  const filtersKey = JSON.stringify(filters);
  const currentFilters = useRef(filtersKey);
  currentFilters.current = filtersKey;

  // Choosing is per collection and per visit: leaving the page ends it.
  useEffect(() => cancel, [collection.id, cancel]);

  // The ticks were made on a list that a new search, filter or sort replaces.
  useEffect(cancel, [filtersKey, cancel]);
  // A ticked link that was deleted or filed out of the collection is no longer on the page.
  useEffect(() => { drop(new Set(all.gone.split(","))); }, [all.gone, drop]);

  // Null when the user moved on while the pages loaded: they cancelled, or searched or sorted again.
  async function loadAllFor(kind: "open" | "select") {
    if (loading !== null) return null;
    const { session } = useSelection.getState();
    const filtersThen = currentFilters.current;
    setLoading(kind);
    try {
      const links = await all.loadAll();
      const overtaken = currentFilters.current !== filtersThen || (kind === "select" && useSelection.getState().session !== session);
      return overtaken ? null : links;
    } finally {
      setLoading(null);
    }
  }

  async function openAllLinks() {
    const links = await loadAllFor("open");
    if (links) opening.request(links.map((link) => link.originalUrl));
  }

  async function selectAll() {
    const links = await loadAllFor("select");
    if (links) chooseAll(links);
  }

  const actions =
    collection.linkCount > 0 ? (
      <>
        {/* aria-disabled, not disabled, so the button keeps keyboard focus while it loads. */}
        <Button
          variant="ghost"
          size="touch"
          disabled={!all.ready}
          aria-disabled={loading !== null || undefined}
          aria-busy={loading === "open"}
          onClick={() => void openAllLinks()}
          className={cn(HEADER_BUTTON, loading !== null && "opacity-60")}
        >
          {loading === "open" ? <LoaderCircle aria-hidden className="size-[15px] animate-spin" /> : <ExternalLink aria-hidden className="size-[15px]" />}
          Open all
        </Button>
        <Button variant="ghost" size="touch" aria-pressed={selecting} disabled={!all.ready} onClick={selecting ? cancel : start} className={HEADER_BUTTON}>
          <CheckSquare aria-hidden className="size-[15px]" />
          Select
        </Button>
        <span role="status" className="sr-only">
          {loading === null ? "" : "Loading all links…"}
        </span>
      </>
    ) : null;

  const extras = (
    <>
      {opening.banner}
      {opening.dialog}
      {selecting ? <SelectionBar loading={loading === "select"} onOpen={(urls) => { opening.request(urls, cancel); }} onSelectAll={() => void selectAll()} /> : null}
    </>
  );
  return { actions, extras };
}
