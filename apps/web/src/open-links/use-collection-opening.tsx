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
  const { start, cancel, chooseAll } = useSelection.getState();
  const [loading, setLoading] = useState<"open" | "select" | null>(null);
  // The session the running load belongs to; null when none runs. A second click while one runs does nothing.
  const loadingSession = useRef<number | null>(null);
  // Stringified so an equal filter object from a new render does not count as a change.
  const filtersKey = JSON.stringify(filters);

  // The ticks were made on one collection's list under one search, filter and sort; a change ends them
  // and any load still running (cancel bumps the session, which every load checks when it lands).
  useEffect(() => {
    cancel();
    loadingSession.current = null;
    setLoading(null);
  }, [collection.id, filtersKey, cancel]);
  // Leaving the page ends it too, with no state left to update.
  useEffect(() => () => {
    cancel();
    loadingSession.current = null;
  }, [cancel]);

  // Null when the user moved on while the pages loaded.
  async function loadAllFor(kind: "open" | "select") {
    if (loadingSession.current !== null) return null;
    const { session } = useSelection.getState();
    const isCurrent = () => useSelection.getState().session === session;
    loadingSession.current = session;
    setLoading(kind);
    try {
      const links = await all.loadAll(isCurrent);
      return isCurrent() ? links : null;
    } finally {
      // Not this load's to clear once the user has moved on: the reset above (or a newer load) owns it.
      if (loadingSession.current === session) {
        loadingSession.current = null;
        setLoading(null);
      }
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
      {selecting ? <SelectionBar loading={loading === "select"} onOpen={() => { opening.request(all.stillChosen(useSelection.getState().chosen), cancel); }} onSelectAll={() => void selectAll()} /> : null}
    </>
  );
  return { actions, extras };
}
