import type { ListedCollection } from "@linkables/shared/collections";
import type { SavedLink } from "@linkables/shared/links";
import { describe, expect, it } from "vitest";
import { collectionRows, linkMeta, linksPath, linkTitle, pinnedFirst } from "./link-list";

let next = 0;
function link(overrides: Partial<SavedLink> = {}): SavedLink {
  next += 1;
  return {
    id: `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`,
    originalUrl: "https://www.example.com/a",
    titleOverride: null,
    note: null,
    pinned: false,
    savedAt: "2026-10-24T10:00:00.000Z",
    savedFrom: "extension",
    collections: [],
    resource: {
      id: "7f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f",
      canonicalUrl: "https://www.example.com/a",
      title: "Example",
      description: null,
      author: null,
      faviconUrl: null,
      thumbnailUrl: null,
      kind: "page",
      fetchStatus: "fetched",
    },
    ...overrides,
  };
}

function collection(name: string, lastUsedAt: string, pinned = false): ListedCollection {
  next += 1;
  return {
    id: `00000000-0000-4000-8000-${String(next).padStart(12, "0")}`,
    name,
    pinned,
    createdAt: "2026-10-01T00:00:00.000Z",
    lastUsedAt,
    linkCount: 0,
    cover: [],
  };
}

describe("linksPath", () => {
  it("lists every link for Recent", () => {
    expect(linksPath("recent", "")).toBe("/links");
  });

  it("lists only pinned links for Pinned", () => {
    expect(linksPath("pinned", "")).toBe("/links?pinned=true");
  });

  it("sends the search, trimmed", () => {
    expect(linksPath("pinned", "  rust book ")).toBe("/links?pinned=true&q=rust+book");
  });
});

describe("pinnedFirst", () => {
  it("puts pinned links on top and keeps the newest-first order inside each group", () => {
    const a = link();
    const b = link({ pinned: true });
    const c = link();
    const d = link({ pinned: true });
    expect(pinnedFirst([a, b, c, d])).toEqual([b, d, a, c]);
  });
});

describe("linkTitle", () => {
  it("prefers the user's title, then the fetched one", () => {
    expect(linkTitle(link({ titleOverride: "Mine" }))).toBe("Mine");
    expect(linkTitle(link())).toBe("Example");
  });

  it("falls back to the address without its scheme", () => {
    expect(linkTitle(link({ resource: { ...link().resource, title: null } }))).toBe("www.example.com/a");
  });
});

describe("linkMeta", () => {
  const now = Date.parse("2026-10-24T12:00:00.000Z");

  it("names the site, the first collection and how long ago it was saved", () => {
    const filed = link({ collections: [{ id: "00000000-0000-4000-8000-000000000999", name: "rust" }] });
    expect(linkMeta(filed, now)).toBe("example.com · in Rust · 2h");
  });

  it("leaves the collection out for a link in none", () => {
    expect(linkMeta(link({ savedAt: "2026-10-24T11:59:30.000Z" }), now)).toBe("example.com · now");
  });

  it("gives a date for a link saved days ago", () => {
    expect(linkMeta(link({ savedAt: "2026-10-20T10:00:00.000Z" }), now)).toBe("example.com · Oct 20");
  });
});

describe("collectionRows", () => {
  const travel = collection("Travel", "2026-10-21T00:00:00.000Z");
  const recipes = collection("Recipes", "2026-10-23T00:00:00.000Z");
  const old = collection("Old stuff", "2026-01-01T00:00:00.000Z", true);

  it("puts pinned collections first, then the most recently used", () => {
    expect(collectionRows([travel, recipes, old], "")).toEqual([old, recipes, travel]);
  });

  it("finds collections by name, ignoring case", () => {
    expect(collectionRows([travel, recipes, old], " TRAV ")).toEqual([travel]);
  });
});
