import type { SharedLink } from "@linkables/shared/sharing";
import { cn } from "cn";
import { Play } from "lucide-react";
import { useState } from "react";
import { domainOf, tileFor } from "../links/link-display";

// Size and radius come from className.
//
// Image URLs come from the linked pages; no-referrer keeps the shared page's
// address, which holds the token, out of third-party logs.
export function SharedThumb({ link, className }: { link: SharedLink; className: string }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const { thumbnailUrl, kind } = link;
  const frame = cn("relative flex shrink-0 items-center justify-center overflow-hidden", className);

  if (thumbnailUrl && !thumbFailed) {
    return (
      <span aria-hidden className={cn(frame, "bg-muted")}>
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => { setThumbFailed(true); }}
          className="size-full object-cover"
        />
        {kind === "video" ? <PlayBadge /> : null}
      </span>
    );
  }
  if (kind === "video") {
    return (
      <span aria-hidden className={cn(frame, "bg-[linear-gradient(140deg,#2c2c2c,#1b1b1b)]")}>
        <PlayBadge />
      </span>
    );
  }
  const { hue, letter } = tileFor(domainOf(link.url));
  return (
    <span
      aria-hidden
      className={cn(frame, "font-display text-[28px] font-semibold")}
      style={{
        background: `linear-gradient(140deg, oklch(0.33 0.055 ${String(hue)}), oklch(0.25 0.04 ${String(hue)}))`,
        color: `oklch(0.86 0.08 ${String(hue)})`,
      }}
    >
      {letter}
    </span>
  );
}

function PlayBadge() {
  return (
    <span className="absolute flex size-12 items-center justify-center rounded-full bg-black/55 text-white">
      <Play className="size-5 fill-current" />
    </span>
  );
}
