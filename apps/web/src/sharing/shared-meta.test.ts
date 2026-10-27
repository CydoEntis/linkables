import type { SharedCollection } from "@linkables/shared/sharing";
import { describe, expect, it } from "vitest";
import { sharedMeta } from "./shared-meta";

const NOW = new Date("2026-10-25T12:00:00Z").getTime();

const LINK = { url: "https://a.example/", title: null, description: null, thumbnailUrl: null, faviconUrl: null, kind: null };

function collection({ linkCount = 5, ...overrides }: Partial<SharedCollection>): SharedCollection {
  return { name: "Trip", linkCount, updatedAt: null, links: Array.from({ length: linkCount }, () => LINK), ...overrides };
}

describe("sharedMeta", () => {
  it("counts the links and says when the newest was added", () => {
    expect(sharedMeta(collection({ updatedAt: "2026-10-24T00:00:00.000Z" }), NOW)).toBe("5 links · updated Oct 24");
  });

  it("adds the year to a date from another year", () => {
    expect(sharedMeta(collection({ updatedAt: "2025-03-02T00:00:00.000Z" }), NOW)).toBe("5 links · updated Mar 2, 2025");
  });

  it("leaves the date out of an empty collection", () => {
    expect(sharedMeta(collection({ linkCount: 0 }), NOW)).toBe("0 links");
  });

  it("leaves the date out when an older API doesn't send one", () => {
    expect(sharedMeta(collection({ updatedAt: undefined }), NOW)).toBe("5 links");
  });

  it("says when only the newest links are shown", () => {
    expect(sharedMeta(collection({ linkCount: 600, links: [LINK] }), NOW)).toBe("600 links · showing the newest 1");
  });

  it("counts the links in groups as shown", () => {
    const groups = [{ name: "Food", linkCount: 3, links: [LINK, LINK, LINK] }];

    expect(sharedMeta(collection({ linkCount: 5, links: [LINK, LINK], groups }), NOW)).toBe("5 links");
    expect(sharedMeta(collection({ linkCount: 9, links: [LINK, LINK], groups }), NOW)).toBe("9 links · showing the newest 5");
  });
});
