import type { SavedLink } from "@linkables/shared/links";
import { describe, expect, it, vi } from "vitest";
import { findPageLink, lookupQuery, savedMatch } from "./this-page";

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

describe("findPageLink", () => {
  const url = "https://github.com/";
  const page = (canonicalUrls: string[], cursor: string | null) => ({ items: canonicalUrls.map(link), cursor });

  it("follows the cursor past newer links whose address only contains the page's", async () => {
    const pages = [page(["https://github.com/a"], "2"), page(["https://github.com/b"], "3"), page(["https://github.com/"], "4")];
    const fetchPage = vi.fn((cursor: string | undefined) => Promise.resolve(pages[cursor === undefined ? 0 : Number(cursor) - 1] ?? page([], null)));
    await expect(findPageLink(url, fetchPage)).resolves.toMatchObject({ status: "saved", link: { resource: { canonicalUrl: url } } });
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([undefined, "2", "3"]);
  });

  it("says not saved once every match was read", async () => {
    const fetchPage = vi.fn(() => Promise.resolve(page(["https://github.com/a"], null)));
    await expect(findPageLink(url, fetchPage)).resolves.toEqual({ status: "not-saved" });
  });

  it("can't tell after five pages that still have more", async () => {
    const fetchPage = vi.fn(() => Promise.resolve(page(["https://github.com/a"], "next")));
    await expect(findPageLink(url, fetchPage)).resolves.toEqual({ status: "unknown" });
    expect(fetchPage).toHaveBeenCalledTimes(5);
  });

  it("can't tell for an address too long to search for", async () => {
    const fetchPage = vi.fn(() => Promise.resolve(page([], null)));
    await expect(findPageLink(`https://example.com/${"a".repeat(200)}`, fetchPage)).resolves.toEqual({ status: "unknown" });
    expect(fetchPage).not.toHaveBeenCalled();
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
