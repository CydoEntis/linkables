import { describe, expect, it } from "vitest";
import { coverCells } from "./cover";

describe("coverCells", () => {
  it("always gives four cells, padding an empty collection with its own tints", () => {
    const cells = coverCells("Rust", []);
    expect(cells).toHaveLength(4);
    expect(cells.every((cell) => cell.kind === "fill")).toBe(true);
    expect(coverCells("rust", [])).toEqual(cells);
  });

  it("uses a filing's thumbnail as an image and draws the rest as tiles", () => {
    const cells = coverCells("Watch later", [
      { kind: "video", thumbnailUrl: "https://i.ytimg.com/a.jpg", domain: "www.youtube.com" },
      { kind: "video", thumbnailUrl: null, domain: "www.youtube.com" },
      { kind: "page", thumbnailUrl: null, domain: "doc.rust-lang.org" },
    ]);
    expect(cells[0]).toEqual({ kind: "image", src: "https://i.ytimg.com/a.jpg" });
    expect(cells[1]).toEqual({ kind: "fill", background: "linear-gradient(140deg,#2c2c2c,#1b1b1b)" });
    expect(cells[2]?.kind).toBe("fill");
    expect(cells[3]).toEqual({ kind: "fill", background: "#222" });
  });
});
