import type { SavedLink } from "@linkables/shared/links";
import { describe, expect, it } from "vitest";
import { lookupQuery, savedMatch } from "./this-page";

function link(canonicalUrl: string): SavedLink {
  return {
    id: "6f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f",
    originalUrl: canonicalUrl,
    titleOverride: null,
    note: null,
    pinned: false,
    savedAt: "2026-10-24T10:00:00.000Z",
    savedFrom: "extension",
    collections: [],
    resource: {
      id: "7f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f",
      canonicalUrl,
      title: null,
      description: null,
      author: null,
      faviconUrl: null,
      thumbnailUrl: null,
      kind: null,
      fetchStatus: "fetched",
    },
  };
}

describe("lookupQuery", () => {
  it("searches for the page's canonical address", () => {
    expect(lookupQuery("https://example.com/a?fbclid=1#top")).toBe("https://example.com/a");
  });

  it("does not search for an address longer than a search may be", () => {
    expect(lookupQuery(`https://example.com/${"a".repeat(200)}`)).toBeNull();
  });
});

describe("savedMatch", () => {
  it("finds the link saved for this page", () => {
    const saved = link("https://example.com/a");
    expect(savedMatch("https://example.com/a#top", [link("https://example.com/a/b"), saved])).toBe(saved);
  });

  it("finds nothing when only longer addresses matched the search", () => {
    expect(savedMatch("https://example.com/a", [link("https://example.com/a/b")])).toBeNull();
  });
});
