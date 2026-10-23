import type { SavedLink } from "@linkables/shared/links";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ApiError, NETWORK_ERROR } from "../api/client";
import { isNarrowed, type FiltersChange, type ListFilters } from "../search/list-filters";
import { NoMatches } from "../search/NoMatches";
import { groupLinks, type LinkGroup } from "./link-groups";
import { LinkRow, type RowHighlight } from "./LinkRow";
import { useLinksUi } from "./links-ui-store";
import { LinksEmpty } from "./LinksEmpty";
import { belongsIn, useLinks, type ListScope } from "./use-links";
import { useHeldRow } from "./use-held-row";

type LinkListProps = { scope: ListScope; filters?: ListFilters; onFiltersChange?: FiltersChange };

const noChange: FiltersChange = () => undefined;

export function LinkList({ scope, filters = {}, onFiltersChange = noChange }: LinkListProps) {
  const { query, loadMore } = useLinks(scope, filters);
  const now = useNow();
  const highlightFor = useRowHighlight();
  const leavingIds = useLinksUi((state) => state.leavingIds);
  const heldId = useLinksUi((state) => state.heldId);
  const loaded = useHeldRow(query.data?.pages.flatMap((page) => page.items) ?? []);

  const narrowed = isNarrowed(filters);
  if (query.isPending) return <LinkListSkeleton />;
  if (query.isError && query.data === undefined) {
    return <LoadProblem error={query.error} onRetry={() => void query.refetch()} />;
  }

  // A link filed out of this list on this device goes at once (after its leave
  // animation), without waiting for the refetch; a held row waits for its popover.
  const belongs = (link: SavedLink) => belongsIn(scope, link, filters);
  const stays = (link: SavedLink) => belongs(link) || link.id === heldId;
  const links = loaded.filter((link) => stays(link) || leavingIds.includes(link.id));
  const status = narrowed ? <ResultCount count={links.length} more={query.hasNextPage} searching={query.isPlaceholderData} /> : null;
  if (links.length === 0) {
    return (
      <>
        {status}
        {narrowed ? <NoMatches filters={filters} onFiltersChange={onFiltersChange} /> : <LinksEmpty scope={scope} />}
      </>
    );
  }

  const renderRow = (link: SavedLink) => (
    <li key={link.id}>
      <LinkRow
        link={link}
        now={now}
        inCollection={"collectionId" in scope}
        highlight={highlightFor(link.id)}
        belongs={belongs(link)}
        leaving={!stays(link)}
        query={filters.q}
      />
    </li>
  );
  return (
    <div className="flex flex-col gap-2 md:gap-[22px]">
      {status}
      {listGroups(links, now, scope, filters).map((group) =>
        group.label === null ? (
          <ul key="results">{group.links.map(renderRow)}</ul>
        ) : (
          <section key={group.label} aria-labelledby={`group-${group.label}`}>
            <h2
              id={`group-${group.label}`}
              className="px-3 pb-1 text-xs font-semibold tracking-[0.02em] text-subtle-foreground md:px-3.5 md:pb-1.5 md:text-[12.5px]"
            >
              {group.label}
            </h2>
            <ul>{group.links.map(renderRow)}</ul>
          </section>
        ),
      )}
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          disabled={query.isFetchingNextPage}
          onClick={() => void loadMore()}
          size="touch"
          className="self-center"
        >
          {query.isFetchingNextPage ? "Loading…" : query.isFetchNextPageError ? "Couldn't load more. Try again" : "Load more"}
        </Button>
      ) : null}
    </div>
  );
}

// Day groups follow the newest-first order; search results and other sorts are
// one list in the API's order (pinned still first), as in the handoff's search.
function listGroups(links: SavedLink[], now: number, scope: ListScope, filters: ListFilters): (LinkGroup | { label: null; links: SavedLink[] })[] {
  if (filters.q !== undefined || (filters.sort ?? "newest") !== "newest") return [{ label: null, links }];
  const pinnedView = "view" in scope && scope.view === "pinned";
  return groupLinks(links, now, { pinnedGroup: !pinnedView });
}

// A loaded count: past the first page the total is unknown, so it reads "50+".
function ResultCount({ count, more, searching }: { count: number; more: boolean; searching: boolean }) {
  const total = `${String(count)}${more ? "+" : ""}`;
  return (
    <p role="status" className={cn("px-3 text-[13.5px] text-muted-foreground md:px-3.5", count === 0 && !searching && "sr-only")}>
      {searching ? "Searching…" : `${total} ${count === 1 && !more ? "match" : "matches"}`}
    </p>
  );
}

function useRowHighlight(): (linkId: string) => RowHighlight | undefined {
  const hopId = useLinksUi((state) => state.hopId);
  const flashId = useLinksUi((state) => state.flashId);
  return (linkId) => (linkId === hopId ? "hop" : linkId === flashId ? "flash" : undefined);
}

const MINUTE = 60_000;

// Relative times ("5m") stay current while the page sits open.
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => { setNow(Date.now()); }, MINUTE);
    return () => { clearInterval(timer); };
  }, []);
  return now;
}

const SKELETON_WIDTHS = [
  ["62%", "34%"],
  ["48%", "28%"],
  ["70%", "40%"],
  ["55%", "30%"],
  ["66%", "36%"],
  ["44%", "26%"],
] as const;

const SHIMMER = "animate-shimmer bg-[linear-gradient(90deg,#1b1b1b_25%,#272727_50%,#1b1b1b_75%)] bg-size-[200%_100%]";

function LinkListSkeleton() {
  return (
    <div className="flex flex-col gap-0.5 pt-6">
      <p role="status" className="sr-only">Loading your links</p>
      {SKELETON_WIDTHS.map(([title, meta], index) => (
        <div
          key={index}
          aria-hidden
          className="flex animate-fade-in items-center gap-3.5 px-3 py-2.5 md:px-3.5"
          style={{ animationDelay: `${String(index * 60)}ms` }}
        >
          <span className={`h-[38px] w-[58px] shrink-0 rounded-[9px] md:h-[46px] md:w-[72px] ${SHIMMER}`} />
          <span className="flex flex-1 flex-col gap-2">
            <span className={`h-3 rounded-md ${SHIMMER}`} style={{ width: title }} />
            <span className="h-[9px] rounded-[5px] bg-card" style={{ width: meta }} />
          </span>
        </div>
      ))}
    </div>
  );
}

function LoadProblem({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const offline = error instanceof ApiError && error.code === NETWORK_ERROR;
  return (
    <div role="alert" className="flex flex-col items-start gap-3 px-3 py-14 md:px-3.5">
      <p className="text-[17px] font-bold md:text-xl">{offline ? "Can't reach linkables" : "Couldn't load your links"}</p>
      <p className="text-sm text-muted-foreground md:text-[14.5px]">
        {offline ? "Check your connection, then try again." : "Something went wrong on our side."}
      </p>
      <Button variant="ghost" size="touch" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
