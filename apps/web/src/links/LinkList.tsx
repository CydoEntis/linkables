import type { SavedLink } from "@linkables/shared/links";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { ApiError, NETWORK_ERROR } from "@linkables/shared/api-client";
import { isNarrowed, type FiltersChange, type ListFilters } from "../search/list-filters";
import { NoMatches } from "../search/NoMatches";
import { groupLinks, type LinkGroup } from "./link-groups";
import { LinkCard } from "./LinkCard";
import { LinkRow, type LinkRowProps, type RowHighlight } from "./LinkRow";
import { useListLayout } from "./list-layout";
import { useLinksUi } from "./links-ui-store";
import { LinksEmpty } from "./LinksEmpty";
import { belongsIn, useLinks, type ListScope } from "./use-links";
import { useFocusReturningRow } from "./use-focus-returning-row";
import { useHeldRow } from "./use-held-row";

type LinkListProps = { scope: ListScope; filters?: ListFilters; onFiltersChange?: FiltersChange };

const noChange: FiltersChange = () => undefined;

export function LinkList({ scope, filters = {}, onFiltersChange = noChange }: LinkListProps) {
  const { query, loadMore } = useLinks(scope, filters);
  const now = useNow();
  const highlightFor = useRowHighlight();
  const leavingIds = useLinksUi((state) => state.leavingIds);
  const heldId = useLinksUi((state) => state.heldId);
  const deletingIds = useLinksUi((state) => state.deletingIds);
  const loaded = useHeldRow(query.data?.pages.flatMap((page) => page.items) ?? []);
  const layout = useListLayout();

  // A link filed out of this list on this device goes at once (after its leave
  // animation), without waiting for the refetch; a held row waits for its popover.
  // A link inside its delete Undo window leaves the same way.
  const belongs = (link: SavedLink) => belongsIn(scope, link, filters);
  const stays = (link: SavedLink) => !deletingIds.includes(link.id) && (belongs(link) || link.id === heldId);
  const links = loaded.filter((link) => stays(link) || leavingIds.includes(link.id));
  useFocusReturningRow(!query.isPending, loaded.map((link) => link.id));

  const narrowed = isNarrowed(filters);
  // One status region in every state, so a change to "0 matches" is announced too.
  const withStatus = (body: ReactNode, count: string | null = null) => (
    <>
      <ResultCount text={count} />
      {body}
    </>
  );
  if (query.isPending) return withStatus(<LinkListSkeleton />);
  if (query.isError && query.data === undefined) {
    return withStatus(<LoadProblem error={query.error} onRetry={() => void query.refetch()} />);
  }

  const count = narrowed ? countLabel(links.length, query.hasNextPage, query.isPlaceholderData) : null;
  if (links.length === 0) {
    return withStatus(narrowed ? <NoMatches filters={filters} onFiltersChange={onFiltersChange} /> : <LinksEmpty scope={scope} />, count);
  }

  const itemProps = (link: SavedLink): LinkRowProps => ({
    link,
    now,
    inCollection: "collectionId" in scope,
    highlight: highlightFor(link.id),
    belongs: belongs(link),
    leaving: !stays(link),
    query: filters.q,
  });
  const groups = listGroups(links, now, scope, filters);
  return withStatus(
    <div className="flex flex-col gap-2 md:gap-[22px]">
      {layout === "grid" ? (
        <LinkGrid links={groups.flatMap((group) => group.links)} itemProps={itemProps} />
      ) : (
        <LinkGroups groups={groups} itemProps={itemProps} />
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
    </div>,
    count,
  );
}

type ListGroup = LinkGroup | { label: null; links: SavedLink[] };
type ItemProps = (link: SavedLink) => LinkRowProps;

function LinkGroups({ groups, itemProps }: { groups: ListGroup[]; itemProps: ItemProps }) {
  const renderRow = (link: SavedLink) => (
    <li key={link.id}>
      <LinkRow {...itemProps(link)} />
    </li>
  );
  return groups.map((group) =>
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
  );
}

// One grid in the list's order; pinned cards carry a tag instead of a group heading.
function LinkGrid({ links, itemProps }: { links: SavedLink[]; itemProps: ItemProps }) {
  return (
    <ul aria-label="Links" className="grid animate-fade-in grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-[22px] pt-3.5">
      {links.map((link) => (
        <li key={link.id}>
          <LinkCard {...itemProps(link)} />
        </li>
      ))}
    </ul>
  );
}

// Day groups follow the newest-first order; search results and other sorts are
// one list in the API's order (pinned still first), as in the handoff's search.
function listGroups(links: SavedLink[], now: number, scope: ListScope, filters: ListFilters): ListGroup[] {
  if (filters.q !== undefined || (filters.sort ?? "newest") !== "newest") return [{ label: null, links }];
  const pinnedView = "view" in scope && scope.view === "pinned";
  return groupLinks(links, now, { pinnedGroup: !pinnedView });
}

// A loaded count: past the first page the total is unknown, so it reads "50+".
function countLabel(count: number, more: boolean, searching: boolean): string {
  if (searching) return "Searching…";
  return `${String(count)}${more ? "+" : ""} ${count === 1 && !more ? "match" : "matches"}`;
}

// "0 matches" is read out but not shown: the no-matches message says it on screen.
function ResultCount({ text }: { text: string | null }) {
  return (
    <p
      role="status"
      className={cn("px-3 text-[13.5px] text-muted-foreground md:mb-[22px] md:px-3.5 max-md:mb-2", (text === null || text.startsWith("0 ")) && "sr-only")}
    >
      {text}
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
