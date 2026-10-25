import type { ListedCollection } from "@linkables/shared/collections";
import { describe, expect, it } from "vitest";
import { freezeOrder, locationLabel, pickerRows } from "./picker";

let next = 0;
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

const rust = collection("rust", "2026-10-20T00:00:00.000Z");
const recipes = collection("Recipes", "2026-10-23T00:00:00.000Z");
const music = collection("Music", "2026-10-22T00:00:00.000Z");
const travel = collection("Travel", "2026-10-21T00:00:00.000Z");
const old = collection("Old stuff", "2026-01-01T00:00:00.000Z", true);
const all = [old, recipes, music, travel, rust];

describe("freezeOrder", () => {
  it("orders collections by most recently used, pinned or not", () => {
    expect(freezeOrder([], all)).toEqual([recipes.id, music.id, travel.id, rust.id, old.id]);
  });

  it("keeps the order it froze when a tick makes another collection the most recent", () => {
    const frozen = freezeOrder([], all);
    const ticked = { ...rust, lastUsedAt: "2026-10-24T00:00:00.000Z" };
    expect(freezeOrder(frozen, [old, ticked, recipes, music, travel])).toEqual(frozen);
  });

  it("puts a collection that appears later on top", () => {
    const created = collection("New one", "2026-10-24T00:00:00.000Z");
    expect(freezeOrder([recipes.id, music.id], [created, recipes, music])).toEqual([created.id, recipes.id, music.id]);
  });

  it("drops a collection that is gone", () => {
    expect(freezeOrder([recipes.id, music.id], [music])).toEqual([music.id]);
  });
});

describe("pickerRows", () => {
  const order = freezeOrder([], all);

  it("shows the four most recent collections when there is no search", () => {
    expect(pickerRows({ order, collections: all, filedIds: new Set(), query: "" })).toEqual({
      rows: [recipes, music, travel, rust],
      createName: null,
    });
  });

  it("keeps a filed collection beyond the four in view", () => {
    const { rows } = pickerRows({ order, collections: all, filedIds: new Set([old.id]), query: "" });
    expect(rows).toEqual([recipes, music, travel, rust, old]);
  });

  it("searches every collection by name, ignoring case", () => {
    const { rows } = pickerRows({ order, collections: all, filedIds: new Set(), query: "  STUFF " });
    expect(rows).toEqual([old]);
  });

  it("offers to create the searched name when no collection has it", () => {
    expect(pickerRows({ order, collections: all, filedIds: new Set(), query: " Rus " })).toEqual({
      rows: [rust],
      createName: "Rus",
    });
  });

  it("offers no create when a collection has the name, ignoring case", () => {
    expect(pickerRows({ order, collections: all, filedIds: new Set(), query: "RUST" }).createName).toBeNull();
  });
});

describe("locationLabel", () => {
  it("says In New for a link in no collection", () => {
    expect(locationLabel([])).toBe("In New");
  });

  it("names the collections, each with a capital first letter", () => {
    expect(locationLabel(["rust", "Recipes"])).toBe("In Rust, Recipes");
  });
});
