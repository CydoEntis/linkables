import { COLLECTION_COVER_SIZE, type CoverTile } from "@linkables/shared/collections";
import { tileFor } from "../links/link-display";

export type CoverCell = { kind: "image"; src: string } | { kind: "fill"; background: string };

const VIDEO_FILL = "linear-gradient(140deg,#2c2c2c,#1b1b1b)";
const EMPTY_FILL = "#222";

function tileFill(tile: CoverTile): CoverCell {
  if (tile.thumbnailUrl) return { kind: "image", src: tile.thumbnailUrl };
  if (tile.kind === "video") return { kind: "fill", background: VIDEO_FILL };
  const { hue } = tileFor(tile.domain.replace(/^www\./, ""));
  return { kind: "fill", background: `linear-gradient(140deg, oklch(0.33 0.055 ${String(hue)}), oklch(0.25 0.04 ${String(hue)}))` };
}

// The handoff's 2×2 mini-cover: the newest filings' tiles, then tints of the
// name's hue so an empty collection still has a face of its own.
export function coverCells(name: string, cover: readonly CoverTile[]): CoverCell[] {
  const cells = cover.slice(0, COLLECTION_COVER_SIZE).map(tileFill);
  const { hue } = tileFor(name.toLowerCase());
  const padding = [`oklch(0.33 0.05 ${String(hue)})`, `oklch(0.27 0.04 ${String(hue + 40)})`];
  while (cells.length < COLLECTION_COVER_SIZE) {
    cells.push({ kind: "fill", background: padding[cells.length] ?? EMPTY_FILL });
  }
  return cells;
}
