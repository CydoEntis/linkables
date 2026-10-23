import type { SavedLink } from "@linkables/shared/links";
import { Pin } from "lucide-react";
import { cn } from "cn";
import { displayTitle, domainOf, filedLabel, relativeTime, safeHref, savedFromLabel } from "./link-display";
import { LinkThumb } from "./LinkThumb";
import { isPending } from "./use-links";

export type RowHighlight = "hop" | "flash";

type LinkRowProps = {
  link: SavedLink;
  now: number;
  // On a collection's page every row is in that collection, so the meta skips where it is filed.
  inCollection?: boolean;
  highlight?: RowHighlight | undefined;
};

// The row opens the saved URL itself; link details come in a later version.
export function LinkRow({ link, now, inCollection = false, highlight }: LinkRowProps) {
  const title = displayTitle(link);
  const pending = isPending(link);
  const time = relativeTime(link.savedAt, now);
  const href = safeHref(link.originalUrl);
  const filed = inCollection ? null : filedLabel(link.collections);
  const from = savedFromLabel(link.savedFrom);
  const unsorted = link.collections.length === 0 && !pending;

  return (
    <a
      href={href}
      target={href ? "_blank" : undefined}
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-xl py-2.5 pr-3.5 pl-3 transition-colors hover:bg-row-hover focus-visible:outline-offset-0 md:gap-4 md:px-3.5",
        highlight === "hop" && "animate-hop",
        highlight === "flash" && "animate-glow",
      )}
    >
      <LinkThumb link={link} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-[3px]">
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
        <span aria-hidden className="size-[7px] shrink-0 rounded-full bg-primary md:size-2 md:shadow-[0_0_0_4px_var(--primary-soft)]" />
      ) : null}
      {link.pinned ? <Pin role="img" aria-label="Pinned" className="size-[13px] shrink-0 fill-muted-foreground text-muted-foreground" /> : null}
      <span className="hidden w-14 shrink-0 text-right text-[13px] text-subtle-foreground md:block">{time}</span>
      {href ? <span className="sr-only">(opens in a new tab)</span> : null}
    </a>
  );
}
