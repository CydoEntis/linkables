import type { ListedCollection } from "@linkables/shared/collections";
import { useState } from "react";

export function matchingCollections(collections: readonly ListedCollection[], query: string): ListedCollection[] {
  const needle = query.trim().toLowerCase();
  return needle === "" ? [...collections] : collections.filter((collection) => collection.name.toLowerCase().includes(needle));
}

export function hasExactName(collections: readonly ListedCollection[], query: string): boolean {
  const needle = query.trim().toLowerCase();
  return collections.some((collection) => collection.name.toLowerCase() === needle);
}

// Ticking a collection makes it the most recently used, which would move it under
// the pointer; the order is fixed when the picker opens, and new ones go on top.
export function useFrozenOrder(collections: readonly ListedCollection[]): ListedCollection[] {
  const [ids, setIds] = useState<readonly string[]>([]);
  const fresh = collections.filter((collection) => !ids.includes(collection.id)).map((collection) => collection.id);
  if (fresh.length > 0) setIds([...fresh, ...ids]);
  const byId = new Map(collections.map((collection) => [collection.id, collection]));
  return [...fresh, ...ids].flatMap((id) => byId.get(id) ?? []);
}
