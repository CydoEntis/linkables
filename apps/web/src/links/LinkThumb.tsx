import type { SavedLink } from "@linkables/shared/links";
import { useState } from "react";
import { cn } from "cn";
import { domainOf, tileFor } from "./link-display";
import { isPending } from "./use-links";

const FRAME = "relative flex h-[38px] w-[58px] shrink-0 items-center justify-center overflow-hidden rounded-[9px] md:h-[46px] md:w-[72px] md:rounded-[10px]";

// Resource URLs are image sources only, never links; no-referrer keeps the
// user's library address out of third-party logs.
export function LinkThumb({ link }: { link: SavedLink }) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const markFailed = (src: string) => { setFailed((current) => new Set(current).add(src)); };
  const { thumbnailUrl, faviconUrl, kind } = link.resource;

  if (isPending(link)) {
    return <span aria-hidden className={cn(FRAME, "animate-pulse-soft bg-muted")} />;
  }
  if (thumbnailUrl && !failed.has(thumbnailUrl)) {
    return (
      <span aria-hidden className={cn(FRAME, "bg-muted")}>
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => { markFailed(thumbnailUrl); }}
          className="size-full object-cover"
        />
      </span>
    );
  }
  if (kind === "video") {
    return (
      <span aria-hidden className={cn(FRAME, "bg-[linear-gradient(140deg,#2c2c2c,#1b1b1b)] text-sm text-white md:text-base")}>
        ▶
      </span>
    );
  }
  return <LetterTile link={link} favicon={faviconUrl && !failed.has(faviconUrl) ? faviconUrl : null} onFaviconError={markFailed} />;
}

type LetterTileProps = { link: SavedLink; favicon: string | null; onFaviconError: (src: string) => void };

function LetterTile({ link, favicon, onFaviconError }: LetterTileProps) {
  const { hue, letter } = tileFor(domainOf(link.originalUrl));
  return (
    <span
      aria-hidden
      className={cn(FRAME, "font-display text-[13px] font-semibold md:text-base")}
      style={{
        background: `linear-gradient(140deg, oklch(0.33 0.055 ${String(hue)}), oklch(0.25 0.04 ${String(hue)}))`,
        color: `oklch(0.86 0.08 ${String(hue)})`,
      }}
    >
      {favicon ? (
        <img
          src={favicon}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => { onFaviconError(favicon); }}
          className="size-5 rounded-[4px]"
        />
      ) : (
        letter
      )}
    </span>
  );
}
