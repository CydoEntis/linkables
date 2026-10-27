import type { ListedCollection } from "@linkables/shared/collections";
import { CheckSquare, ExternalLink } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SelectionBar } from "./SelectionBar";
import { useSelection } from "./selection-store";
import { useAllCollectionLinks } from "./use-all-collection-links";
import { useOpenLinks } from "./use-open-links";

// The collection header's Open all and Select, and what they bring up: the
// selection bar, the confirm and the blocked pop-ups banner.
export function useCollectionOpening(collection: ListedCollection): { actions: ReactNode; extras: ReactNode } {
  const opening = useOpenLinks();
  const all = useAllCollectionLinks(collection.id);
  const selecting = useSelection((state) => state.selecting);
  const { start, cancel, chooseAll } = useSelection.getState();

  // Choosing is per collection and per visit: leaving the page ends it.
  useEffect(() => cancel, [collection.id, cancel]);

  async function openAllLinks() {
    const links = await all.loadAll();
    if (links) opening.request(links.map((link) => link.originalUrl));
  }

  async function selectAll() {
    const links = await all.loadAll();
    if (links) chooseAll(links);
  }

  const actions =
    collection.linkCount > 0 ? (
      <>
        <Button variant="ghost" size="touch" disabled={!all.ready} onClick={() => void openAllLinks()} className="px-4 font-bold md:h-10">
          <ExternalLink aria-hidden className="size-[15px]" />
          Open all
        </Button>
        <Button variant="ghost" size="touch" aria-pressed={selecting} disabled={!all.ready} onClick={selecting ? cancel : start} className="px-4 font-bold md:h-10">
          <CheckSquare aria-hidden className="size-[15px]" />
          Select
        </Button>
      </>
    ) : null;

  const extras = (
    <>
      {opening.banner}
      {opening.dialog}
      {selecting ? <SelectionBar onOpen={(urls) => { opening.request(urls, cancel); }} onSelectAll={() => void selectAll()} /> : null}
    </>
  );
  return { actions, extras };
}
