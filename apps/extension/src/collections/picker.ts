import type { ListedCollection } from "@linkables/shared/collections";

// The pop-up shows a few recent collections, as in the handoff; search reaches the rest.
const QUICK_PICKS = 4;

// Names are stored as typed; the UI shows them with a capital first letter.
export function displayName(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const byRecentUse = (a: ListedCollection, b: ListedCollection) => b.lastUsedAt.localeCompare(a.lastUsedAt);

// Ticking a collection makes it the most recently used, which would move it under
// the pointer; the order is fixed when the pop-up opens, and new ones go on top.
export function freezeOrder(previous: readonly string[], collections: readonly ListedCollection[]): string[] {
  const present = new Set(collections.map((item) => item.id));
  const seen = new Set(previous);
  const fresh = collections.filter((item) => !seen.has(item.id)).sort(byRecentUse).map((item) => item.id);
  return [...fresh, ...previous.filter((id) => present.has(id))];
}

type PickerInput = {
  order: readonly string[];
  collections: readonly ListedCollection[];
  filedIds: ReadonlySet<string>;
  query: string;
};

export function pickerRows({ order, collections, filedIds, query }: PickerInput) {
  const byId = new Map(collections.map((item) => [item.id, item]));
  const ordered = order.flatMap((id) => byId.get(id) ?? []);
  const needle = query.trim().toLowerCase();
  if (needle === "") {
    const quick = ordered.slice(0, QUICK_PICKS);
    const filedBeyond = ordered.slice(QUICK_PICKS).filter((item) => filedIds.has(item.id));
    return { rows: [...quick, ...filedBeyond], createName: null };
  }
  const rows = ordered.filter((item) => item.name.toLowerCase().includes(needle));
  const exact = collections.some((item) => item.name.toLowerCase() === needle);
  return { rows, createName: exact ? null : query.trim() };
}

export function locationLabel(names: readonly string[]): string {
  return names.length === 0 ? "In New" : `In ${names.map(displayName).join(", ")}`;
}
