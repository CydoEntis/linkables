import type { SavedLink } from "@linkables/shared/links";
import { useState } from "react";
import { cn } from "cn";
import { domainOf, tileFor } from "../links/link-display";
import { isPending } from "../links/use-links";

const FRAME = "relative flex aspect-video shrink-0 animate-pop items-center justify-center overflow-hidden rounded-[16px] md:rounded-xl";

// The handoff's 16:9 media: the page image when there is one, else a player mock
// for videos and the tinted letter tile for pages. Decoration only.
export function LinkMedia({ link }: { link: SavedLink }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const { thumbnailUrl, kind } = link.resource;
  const video = kind === "video";

  if (isPending(link)) return <span aria-hidden className={cn(FRAME, "animate-pulse-soft bg-muted")} />;
  const image = thumbnailUrl && thumbnailUrl !== failedSrc ? thumbnailUrl : null;
  const { hue, letter } = tileFor(domainOf(link.originalUrl));

  return (
    <div
      aria-hidden
      className={cn(FRAME, "font-display text-[40px] font-semibold")}
      style={
        video && !image
          ? { background: "linear-gradient(140deg, #2c2c2c, #1b1b1b)" }
          : {
              background: `linear-gradient(140deg, oklch(0.33 0.055 ${String(hue)}), oklch(0.25 0.04 ${String(hue)}))`,
              color: `oklch(0.86 0.08 ${String(hue)})`,
            }
      }
    >
      {image ? (
        <img
          src={image}
          alt=""
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => { setFailedSrc(image); }}
          className="absolute inset-0 size-full object-cover"
        />
      ) : null}
      {video ? <PlayerMock /> : image ? null : letter}
    </div>
  );
}

function PlayerMock() {
  return (
    <>
      <span className="relative flex size-16 items-center justify-center rounded-full bg-white/95 text-[22px] text-[#111] shadow-[0_10px_30px_rgb(0_0_0/0.4)]">▶</span>
      <span className="absolute inset-x-3 bottom-3 h-1 rounded-sm bg-white/25">
        <span className="block h-full w-[28%] rounded-sm bg-primary" />
      </span>
    </>
  );
}
