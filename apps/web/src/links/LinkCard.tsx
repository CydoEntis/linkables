import type { SavedLink } from "@linkables/shared/links";
import { Link } from "@tanstack/react-router";
import { Pin } from "lucide-react";
import { cn } from "cn";
import { useLinkDetails } from "../link-details/details-search";
import { MatchedText } from "../search/MatchedText";
import { displayTitle, domainOf, filedLabel, relativeTime } from "./link-display";
import { openDetails, RowActions, startDrag, type LinkRowProps } from "./LinkRow";
import { LinkThumb } from "./LinkThumb";
import { useLinksUi } from "./links-ui-store";
import { isPending } from "./use-links";
import { usePinLink } from "./use-pin-link";

// The grid's card: a row's link and actions, laid out around the image.
// It keeps the row's data attributes so focus hand-offs treat both alike.
export function LinkCard({ link, now, selected = false, inCollection = false, highlight, belongs = true, leaving = false, query }: LinkRowProps) {
  const pin = usePinLink(link);
  const details = useLinkDetails();

  return (
    <div
      data-row
      className={cn(
        "group/row relative h-full rounded-2xl transition-transform duration-200 ease-out-soft motion-safe:hover:-translate-y-0.5",
        leaving && "pointer-events-none animate-leave",
      )}
    >
      <Link
        to="."
        search={(prev) => ({ ...prev, link: link.id })}
        aria-current={selected ? "true" : undefined}
        onClick={(event) => { openDetails(event, () => { details.open(link.id); }); }}
        draggable
        onDragStart={(event) => { startDrag(event, link); }}
        onDragEnd={() => { useLinksUi.getState().setDraggingId(null); }}
        data-row-link
        data-link-id={link.id}
        className={cn(
          "flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--border)] transition-shadow aria-[current]:shadow-[0_0_0_2px_var(--foreground)]",
          highlight === "hop" && "animate-hop",
          highlight === "flash" && "animate-glow",
        )}
      >
        <span className="relative">
          <LinkThumb link={link} variant="card" />
          {pin.pinned ? <PinnedTag /> : null}
        </span>
        <CardText link={link} now={now} inCollection={inCollection} query={query} />
        {pin.pinned ? <span className="sr-only">Pinned</span> : null}
      </Link>
      <RowActions link={link} belongs={belongs} pinned={pin.pinned} onPin={pin.toggle} placement="card" />
    </div>
  );
}

function PinnedTag() {
  return (
    <span aria-hidden className="absolute top-2.5 left-2.5 flex h-[22px] items-center gap-1 rounded-full bg-black/60 px-2 text-[11px] font-semibold text-white">
      <Pin aria-hidden className="size-[11px] fill-current" />
      Pinned
    </span>
  );
}

type CardTextProps = { link: SavedLink; now: number; inCollection: boolean; query: string | undefined };

function CardText({ link, now, inCollection, query }: CardTextProps) {
  const title = displayTitle(link);
  const pending = isPending(link);
  const filed = inCollection ? null : filedLabel(link.collections);
  const description = link.resource.description?.trim();
  const unsorted = link.collections.length === 0 && !pending;

  return (
    <span className="flex flex-1 flex-col gap-1.5 px-4 pt-3.5 pb-4">
      <span className={cn("line-clamp-2 text-[15.5px] leading-[1.35] font-semibold wrap-anywhere", title.isUrl && "text-muted-foreground")}>
        <MatchedText text={title.text} query={query} />
      </span>
      {description ? <span className="line-clamp-2 text-[13.5px] leading-[1.45] text-description-foreground">
          <MatchedText text={description} query={query} />
        </span> : null}
      <span className="mt-auto flex items-center gap-1.5 pt-1.5 text-[12.5px] whitespace-nowrap text-muted-foreground">
        <span className="min-w-0 truncate">
          <MatchedText text={domainOf(link.originalUrl)} query={query} />
          {pending ? " · Getting details…" : filed ? ` · ${filed}` : null}
        </span>
        {unsorted ? (
          <span role="img" aria-label="Not in a collection" className="size-[7px] shrink-0 rounded-full bg-primary shadow-[0_0_0_3px_var(--primary-soft)]" />
        ) : null}
        <span className="ml-auto shrink-0">{relativeTime(link.savedAt, now)}</span>
      </span>
    </span>
  );
}
