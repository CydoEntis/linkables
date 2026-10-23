import type { SavedLink } from "@linkables/shared/links";
import { Pin, Plus, Share } from "lucide-react";
import { useState, type DragEvent } from "react";
import { cn } from "cn";
import { AddToPopover } from "../collections/AddToPopover";
import { displayTitle, domainOf, filedLabel, relativeTime, safeHref, savedFromLabel } from "./link-display";
import { LinkThumb } from "./LinkThumb";
import { useLinksUi } from "./links-ui-store";
import { copyLink } from "./share-link";
import { isPending } from "./use-links";
import { usePinLink } from "./use-pin-link";
import { useSwipe } from "./use-swipe";

export type RowHighlight = "hop" | "flash";

export const LINK_DRAG_TYPE = "application/x-linkables-link";

// Three 60 px tiles, 6 px apart, inside 6 px of padding.
const TILES_WIDTH = 3 * 60 + 2 * 6 + 2 * 6;
const TEXT_FADE_PX = 120;

type LinkRowProps = {
  link: SavedLink;
  now: number;
  // On a collection's page every row is in that collection, so the meta skips where it is filed.
  inCollection?: boolean;
  highlight?: RowHighlight | undefined;
  // Whether the link still belongs in this list; one that does not leaves once its popover closes.
  belongs?: boolean;
  leaving?: boolean;
};

// The row opens the saved URL itself; link details come in a later version.
export function LinkRow({ link, now, inCollection = false, highlight, belongs = true, leaving = false }: LinkRowProps) {
  const pin = usePinLink(link);
  const swipeOpen = useLinksUi((state) => state.swipeOpenId === link.id);
  const setSwipeOpenId = useLinksUi((state) => state.setSwipeOpenId);
  const swipe = useSwipe({
    width: TILES_WIDTH,
    open: swipeOpen,
    onOpenChange: (open) => { setSwipeOpenId(open ? link.id : null); },
  });
  const href = safeHref(link.originalUrl);
  const textOpacity = Math.max(0, 1 + swipe.offset / TEXT_FADE_PX);

  return (
    <div data-row className={cn("group/row relative rounded-xl max-md:overflow-hidden", leaving && "pointer-events-none animate-leave")}>
      <a
        href={href}
        target={href ? "_blank" : undefined}
        rel="noopener noreferrer"
        draggable={href !== undefined}
        onDragStart={(event) => { startDrag(event, link); }}
        onDragEnd={() => { useLinksUi.getState().setDraggingId(null); }}
        {...swipe.handlers}
        data-row-link
        className={cn(
          "flex touch-pan-y items-center gap-3 rounded-xl py-2.5 pr-3.5 pl-3 transition-colors group-hover/row:bg-row-hover focus-visible:outline-offset-0 max-md:select-none md:gap-4 md:px-3.5",
          highlight === "hop" && "animate-hop",
          highlight === "flash" && "animate-glow",
        )}
      >
        <LinkThumb link={link} />
        <RowText link={link} now={now} inCollection={inCollection} pinned={pin.pinned} opacity={textOpacity} />
        {href ? <span className="sr-only">(opens in a new tab)</span> : null}
      </a>
      <RowActions link={link} belongs={belongs} pinned={pin.pinned} onPin={pin.toggle} />
      <SwipeTiles
        label={displayTitle(link).text}
        offset={swipe.offset}
        animate={!swipe.dragging}
        pinned={pin.pinned}
        onFocus={() => { setSwipeOpenId(link.id); }}
        onAddTo={() => {
          setSwipeOpenId(null);
          useLinksUi.getState().setAddToLinkId(link.id);
        }}
        onShare={() => {
          setSwipeOpenId(null);
          void copyLink(link.originalUrl);
        }}
        onPin={() => {
          setSwipeOpenId(null);
          pin.toggle();
        }}
      />
    </div>
  );
}

function startDrag(event: DragEvent<HTMLAnchorElement>, link: SavedLink) {
  event.dataTransfer.setData(LINK_DRAG_TYPE, link.id);
  event.dataTransfer.effectAllowed = "copyLink";
  useLinksUi.getState().setDraggingId(link.id);
}

type RowTextProps = { link: SavedLink; now: number; inCollection: boolean; pinned: boolean; opacity: number };

function RowText({ link, now, inCollection, pinned, opacity }: RowTextProps) {
  const title = displayTitle(link);
  const pending = isPending(link);
  const time = relativeTime(link.savedAt, now);
  const filed = inCollection ? null : filedLabel(link.collections);
  const from = savedFromLabel(link.savedFrom);
  const unsorted = link.collections.length === 0 && !pending;

  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-[3px]" style={{ opacity }}>
        <span
          className={cn(
            "line-clamp-2 text-[15px] leading-[1.3] font-semibold wrap-anywhere md:block md:truncate md:text-[15.5px]",
            title.isUrl && "text-muted-foreground",
          )}
        >
          {title.text}
        </span>
        <span className="truncate text-xs text-muted-foreground md:text-[13px]">
          {domainOf(link.originalUrl)}
          {pending ? (
            " · Getting details…"
          ) : (
            <>
              {filed ? ` · ${filed}` : null}
              {from ? <span className="hidden md:inline"> · {from}</span> : null}
              <span className="md:hidden"> · {time}</span>
            </>
          )}
        </span>
      </span>
      {unsorted ? (
        <span
          aria-hidden
          style={{ opacity }}
          className="size-[7px] shrink-0 rounded-full bg-primary md:size-2 md:shadow-[0_0_0_4px_var(--primary-soft)]"
        />
      ) : null}
      {pinned ? <Pin role="img" aria-label="Pinned" className="size-[13px] shrink-0 fill-muted-foreground text-muted-foreground" /> : null}
      <span className="hidden w-14 shrink-0 text-right text-[13px] text-subtle-foreground md:block">{time}</span>
    </>
  );
}

const ACTION = "flex h-[34px] items-center justify-center rounded-md bg-accent text-[13px] font-semibold hover:bg-[#333]";

type RowActionsProps = { link: SavedLink; belongs: boolean; pinned: boolean; onPin: () => void };

// Float over the row's end on hover or keyboard focus, so nothing shifts (handoff global rules).
function RowActions({ link, belongs, pinned, onPin }: RowActionsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const dragging = useLinksUi((state) => state.draggingId !== null);

  function onPickerOpenChange(open: boolean) {
    setPickerOpen(open);
    const ui = useLinksUi.getState();
    ui.setHeldId(open ? link.id : null);
    if (!open) ui.leave(link.id);
  }

  return (
    <div
      role="group"
      // Names the group after the link, so "Share" or "Pin" says which link it acts on.
      aria-label={displayTitle(link).text}
      data-open={pickerOpen || undefined}
      className={cn(
        // Hidden by opacity, not visibility, so the buttons stay focusable and the popover can return focus to its trigger.
        "pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 gap-1.5 bg-[linear-gradient(90deg,transparent,var(--row-hover)_44px)] pl-11 opacity-0 md:flex",
        !dragging &&
          "group-focus-within/row:pointer-events-auto group-focus-within/row:opacity-100 group-hover/row:pointer-events-auto group-hover/row:opacity-100 data-open:pointer-events-auto data-open:opacity-100",
      )}
    >
      <AddToPopover
        link={link}
        open={pickerOpen}
        onOpenChange={onPickerOpenChange}
        finalFocus={(trigger) => (belongs ? trigger : neighbourRowLink(trigger))}
        className={cn(ACTION, "px-3.5")}
      />
      <button type="button" onClick={() => void copyLink(link.originalUrl)} className={cn(ACTION, "px-3.5")}>
        Share
      </button>
      <button
        type="button"
        aria-label="Pin"
        aria-pressed={pinned}
        title={pinned ? "Unpin" : "Pin"}
        onClick={onPin}
        className={cn(ACTION, "w-[34px]", pinned && "bg-foreground text-background hover:bg-foreground")}
      >
        <Pin key={String(pinned)} aria-hidden strokeWidth={2.2} className={cn("size-3.5", pinned && "animate-pin-pop fill-current")} />
      </button>
    </div>
  );
}

// A row about to leave hands focus to the next row (or the one before), not to the page.
function neighbourRowLink(from: HTMLElement): HTMLElement | null {
  const links = [...document.querySelectorAll<HTMLElement>("[data-row-link]")];
  const own = from.closest("[data-row]")?.querySelector<HTMLElement>("[data-row-link]");
  const index = own ? links.indexOf(own) : -1;
  return links[index + 1] ?? links[index - 1] ?? null;
}

type SwipeTilesProps = {
  label: string;
  offset: number;
  animate: boolean;
  pinned: boolean;
  onFocus: () => void;
  onAddTo: () => void;
  onShare: () => void;
  onPin: () => void;
};

const TILE = "flex w-[60px] flex-col items-center justify-center gap-[3px] rounded-[11px] text-[11px] font-semibold";

// The phone's swipe-left actions. Keyboard focus opens them as a swipe would.
function SwipeTiles({ label, offset, animate, pinned, onFocus, onAddTo, onShare, onPin }: SwipeTilesProps) {
  return (
    <div
      role="group"
      aria-label={label}
      onFocus={onFocus}
      style={{ transform: `translateX(${String(TILES_WIDTH + offset)}px)`, opacity: offset === 0 ? 0 : 1 }}
      className={cn("absolute inset-y-0 right-0 z-10 flex gap-1.5 p-1.5 md:hidden", animate && "transition-transform duration-300 ease-out-soft")}
    >
      <button type="button" onClick={onAddTo} className={cn(TILE, "bg-primary text-primary-foreground")}>
        <Plus aria-hidden strokeWidth={2.4} className="size-4" />
        Add to
      </button>
      <button type="button" onClick={onShare} className={cn(TILE, "bg-accent")}>
        <Share aria-hidden strokeWidth={2.2} className="size-4" />
        Share
      </button>
      <button type="button" aria-pressed={pinned} onClick={onPin} className={cn(TILE, pinned ? "bg-foreground text-background" : "bg-accent")}>
        <Pin aria-hidden strokeWidth={2.2} className={cn("size-4", pinned && "fill-current")} />
        {pinned ? "Pinned" : "Pin"}
      </button>
    </div>
  );
}
