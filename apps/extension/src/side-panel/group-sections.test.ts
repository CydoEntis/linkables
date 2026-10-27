import type { Group } from "@linkables/shared/groups";
import { describe, expect, it } from "vitest";
import { collectionLinksPath, groupSections } from "./group-sections";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const group = (id: string, name: string, linkCount: number, shared = true): Group => ({ id, name, position: 0, shared, linkCount });

describe("groupSections", () => {
  it("shows ungrouped links first, then each group in order", () => {
    expect(groupSections([group(A, "Mains", 2), group(B, "Desserts", 1)], 5)).toEqual([
      { id: "none", title: "Ungrouped", linkCount: 2, shared: true },
      { id: A, title: "Mains", linkCount: 2, shared: true },
      { id: B, title: "Desserts", linkCount: 1, shared: true },
    ]);
  });

  it("leaves out the ungrouped section when every link is in a group", () => {
    expect(groupSections([group(A, "Mains", 2)], 2).map((section) => section.id)).toEqual([A]);
  });

  it("keeps an empty group, so the user sees the heading they made", () => {
    expect(groupSections([group(A, "Mains", 0)], 0)).toEqual([{ id: A, title: "Mains", linkCount: 0, shared: true }]);
  });

  it("carries a group's sharing flag", () => {
    expect(groupSections([group(A, "Mains", 1, false)], 1)[0]?.shared).toBe(false);
  });

  it("has no sections for a collection without groups", () => {
    expect(groupSections([], 4)).toEqual([]);
  });
});

describe("collectionLinksPath", () => {
  it("asks for a collection's links, a few at a time", () => {
    expect(collectionLinksPath(A, undefined, 5)).toBe(`/links?collectionId=${A}&limit=5`);
  });

  it("narrows to a group, or to the links in none", () => {
    expect(collectionLinksPath(A, B, 5)).toBe(`/links?collectionId=${A}&groupId=${B}&limit=5`);
    expect(collectionLinksPath(A, "none", 5)).toBe(`/links?collectionId=${A}&groupId=none&limit=5`);
  });
});
