import type { SharedLink } from "@linkables/shared/sharing";
import { cn } from "cn";
import { useState } from "react";
import { domainOf, tileFor } from "../links/link-display";

const FRAME = "relative flex h-[46px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] md:h-[60px] md:w-[96px]";

// Image URLs come from the linked pages; no-referrer keeps the shared page's
// address, which holds the token, out of third-party logs.
export function SharedThumb({ link }: { link: SharedLink }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const [iconFailed, setIconFailed] = useState(false);
  const { thumbnailUrl, faviconUrl, kind } = link;

  if (thumbnailUrl && !thumbFailed) {
    return (
      <span aria-hidden className={cn(FRAME, "bg-muted")}>
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => { setThumbFailed(true); }}
          className="size-full object-cover"
        />
      </span>
    );
  }
  if (kind === "video") {
    return (
      <span aria-hidden className={cn(FRAME, "bg-[linear-gradient(140deg,#2c2c2c,#1b1b1b)] text-base text-white")}>
        ▶
      </span>
    );
  }
  const { hue, letter } = tileFor(domainOf(link.url));
  return (
    <span
      aria-hidden
      className={cn(FRAME, "font-display text-base font-semibold")}
      style={{
        background: `linear-gradient(140deg, oklch(0.33 0.055 ${String(hue)}), oklch(0.25 0.04 ${String(hue)}))`,
        color: `oklch(0.86 0.08 ${String(hue)})`,
      }}
    >
      {faviconUrl && !iconFailed ? (
        <img
          src={faviconUrl}
          alt=""
          width={20}
          height={20}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => { setIconFailed(true); }}
          className="size-5 rounded-[4px]"
        />
      ) : (
        letter
      )}
    </span>
  );
}
