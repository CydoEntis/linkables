import { describe, expect, it } from "vitest";
import { linksSearchSchema } from "../links/links-search";
import { filterChips, hasFilters, isNarrowed, listFiltersSchema } from "./list-filters";

const COLLECTION_ID = "0b6f7a52-8d4e-4f3c-9a1b-2c3d4e5f6a7b";

describe("list search params", () => {
  it("reads every filter from the URL", () => {
    expect(
      linksSearchSchema.parse({
        view: "inbox",
        q: "rust",
        sort: "title",
        kind: "video",
        pinned: true,
        from: "2026-10-01",
        to: "2026-10-20",
        collection: COLLECTION_ID,
      }),
    ).toEqual({
      view: "inbox",
      q: "rust",
      sort: "title",
      kind: "video",
      pinned: true,
      from: "2026-10-01",
      to: "2026-10-20",
      collection: COLLECTION_ID,
    });
  });

  it("drops a bad value without losing the others", () => {
    expect(linksSearchSchema.parse({ view: "nope", sort: "random", kind: "podcast", from: "yesterday", q: "keep" })).toEqual({
      view: "all",
      q: "keep",
    });
  });

  it("treats a blank search as no search", () => {
    expect(listFiltersSchema.parse({ q: "   " })).toEqual({});
  });

  it("keeps a numeric search as text", () => {
    expect(listFiltersSchema.parse({ q: 2026 })).toEqual({ q: "2026" });
  });

  it("drops a search the API would reject", () => {
    expect(listFiltersSchema.parse({ q: "a\u0000b" })).toEqual({});
    expect(listFiltersSchema.parse({ q: "x".repeat(201) })).toEqual({});
  });

  it("reads a reversed date range the right way round", () => {
    expect(listFiltersSchema.parse({ from: "2026-10-20", to: "2026-10-01" })).toEqual({ from: "2026-10-01", to: "2026-10-20" });
  });

  it("drops a date before 1970, which no saved link can have", () => {
    expect(listFiltersSchema.parse({ from: "0050-01-01", to: "1969-12-31" })).toEqual({});
    expect(listFiltersSchema.parse({ from: "1970-01-01" })).toEqual({ from: "1970-01-01" });
  });

  it("ignores a collection filter that is not an id", () => {
    expect(linksSearchSchema.parse({ collection: "rust" })).toEqual({ view: "all" });
  });
});

describe("filter chips", () => {
  const thisYear = String(new Date().getFullYear());

  const names = (id: string) => (id === COLLECTION_ID ? "Rust" : undefined);

  it("shows one chip per active filter with what removing it clears", () => {
    const chips = filterChips({ kind: "page", pinned: true, from: "2024-10-01", to: "2024-10-20", collection: COLLECTION_ID }, names);
    expect(chips.map((chip) => [chip.label, chip.clear])).toEqual([
      ["Pages", { kind: undefined }],
      ["Pinned", { pinned: undefined }],
      ["Oct 1, 2024 – Oct 20, 2024", { from: undefined, to: undefined }],
      ["In Rust", { collection: undefined }],
    ]);
  });

  it("labels an open-ended or one-day range, leaving out this year", () => {
    expect(filterChips({ from: `${thisYear}-10-01` }, names)[0]?.label).toBe("Since Oct 1");
    expect(filterChips({ to: `${thisYear}-10-20` }, names)[0]?.label).toBe("Until Oct 20");
    expect(filterChips({ from: "2024-03-01", to: "2024-03-01" }, names)[0]?.label).toBe("Mar 1, 2024");
  });

  it("shows no chips for a search or a sort alone", () => {
    expect(filterChips({ q: "rust", sort: "oldest" }, names)).toEqual([]);
    expect(hasFilters({ q: "rust", sort: "oldest" })).toBe(false);
    expect(isNarrowed({ q: "rust" })).toBe(true);
    expect(isNarrowed({ sort: "title" })).toBe(false);
  });
});
