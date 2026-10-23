import type { CoverTile } from "@linkables/shared/collections";
import { useState } from "react";
import { cn } from "cn";
import { coverCells } from "./cover";

type MiniCoverProps = { name: string; cover: readonly CoverTile[]; className?: string };

// Size and radius come from className; the cells are decoration, so the cover is hidden from assistive tech.
export function MiniCover({ name, cover, className }: MiniCoverProps) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  return (
    <span aria-hidden className={cn("grid shrink-0 grid-cols-2 gap-px overflow-hidden bg-[#262626]", className)}>
      {coverCells(name, cover).map((cell, index) =>
        cell.kind === "image" && !failed.has(cell.src) ? (
          <img
            key={index}
            src={cell.src}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => { setFailed((current) => new Set(current).add(cell.src)); }}
            className="size-full object-cover"
          />
        ) : (
          <span key={index} style={{ background: cell.kind === "fill" ? cell.background : "#222" }} />
        ),
      )}
    </span>
  );
}
