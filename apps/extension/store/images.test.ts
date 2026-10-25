import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

// The Chrome Web Store rejects an image that is off by a pixel, so each committed one is checked.
const EXPECTED = {
  "icon-128.png": [128, 128],
  "promo-small-440x280.png": [440, 280],
  "screenshot-1-saved.png": [1280, 800],
  "screenshot-2-collections.png": [1280, 800],
} as const;

// A PNG's width and height are the first two fields of its IHDR chunk, right after the signature.
function pngSize(file: string): number[] {
  const png = readFileSync(join(import.meta.dirname, file));
  expect(png.toString("ascii", 12, 16)).toBe("IHDR");
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

it.each(Object.entries(EXPECTED))("%s is exactly the size the store asks for", (file, size) => {
  expect(pngSize(file)).toEqual(size);
});
