import type { SavedLink } from "@linkables/shared/links";
import { describe, expect, it } from "vitest";
import { groupLinks } from "./link-groups";
import { savedLink } from "./test-links";

const now = new Date(2026, 9, 22, 12, 0).getTime();
const at = (day: number, hour = 9) => new Date(2026, 9, day, hour, 0).toISOString();

function labels(links: SavedLink[], pinnedGroup = true) {
  return groupLinks(links, now, { pinnedGroup }).map((group) => [group.label, group.links.map((link) => link.id)]);
}

describe("groupLinks", () => {
  it("groups by local day: Today, Yesterday, This week, Earlier", () => {
    const links = [
      savedLink({ id: "a", savedAt: at(22, 1) }),
      savedLink({ id: "b", savedAt: at(21, 23) }),
      savedLink({ id: "c", savedAt: at(17) }),
      savedLink({ id: "d", savedAt: at(10) }),
    ];
    expect(labels(links)).toEqual([
      ["Today", ["a"]],
      ["Yesterday", ["b"]],
      ["This week", ["c"]],
      ["Earlier", ["d"]],
    ]);
  });

  it("puts pinned links first in their own group, keeping list order", () => {
    const links = [
      savedLink({ id: "a", savedAt: at(22) }),
      savedLink({ id: "b", savedAt: at(20), pinned: true }),
      savedLink({ id: "c", savedAt: at(1), pinned: true }),
    ];
    expect(labels(links)).toEqual([
      ["Pinned", ["b", "c"]],
      ["Today", ["a"]],
    ]);
  });

  it("groups pinned links by day when the view is Pinned", () => {
    const links = [savedLink({ id: "b", savedAt: at(22), pinned: true })];
    expect(labels(links, false)).toEqual([["Today", ["b"]]]);
  });
});
