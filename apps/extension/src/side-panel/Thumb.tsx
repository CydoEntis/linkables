import type { CoverTile } from "@linkables/shared/collections";
import type { SavedLink } from "@linkables/shared/links";
import { cn } from "cn";
import { useState } from "react";
import { domainOf } from "./link-list";

function hueOf(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return (hash * 47) % 360;
}

const tint = (hue: number) => `linear-gradient(140deg, oklch(0.33 0.055 ${String(hue)}), oklch(0.25 0.04 ${String(hue)}))`;

// Resource URLs are image sources only; no-referrer keeps the panel's address out of third-party logs.
function Picture({ src, onError }: { src: string; onError: () => void }) {
  return <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={onError} className="size-full object-cover" />;
}

// The handoff's 48×32 row thumbnail: the page's image, else a tinted letter tile for its site.
export function LinkThumb({ link, className }: { link: SavedLink; className?: string }) {
  const [failed, setFailed] = useState(false);
  const domain = domainOf(link.originalUrl);
  const hue = hueOf(domain);
  const image = link.resource.thumbnailUrl;
  return (
    <span
      aria-hidden
      className={cn("flex h-8 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg font-display text-[12px] font-semibold", className)}
      style={{ background: tint(hue), color: `oklch(0.86 0.08 ${String(hue)})` }}
    >
      {image && !failed ? <Picture src={image} onError={() => { setFailed(true); }} /> : (domain[0] ?? "?").toUpperCase()}
    </span>
  );
}

// A collection's 2×2 mosaic from its newest filings, padded with tints of its name.
export function Mosaic({ name, cover, className }: { name: string; cover: readonly CoverTile[]; className?: string }) {
  const cells = Array.from({ length: 4 }, (_, index) => cover[index]);
  const hue = hueOf(name.toLowerCase());
  return (
    <span aria-hidden className={cn("grid size-9 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-[9px] bg-line-strong", className)}>
      {cells.map((tile, index) =>
        tile?.thumbnailUrl ? (
          <img key={index} src={tile.thumbnailUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover" />
        ) : (
          <span key={index} style={{ background: tile ? tint(hueOf(tile.domain.replace(/^www\./, ""))) : tint(hue + index * 40) }} />
        ),
      )}
    </span>
  );
}
