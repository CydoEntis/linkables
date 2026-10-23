import type { ListedCollection } from "@linkables/shared/collections";

export function listedCollection(overrides: Partial<ListedCollection> = {}): ListedCollection {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: "Rust",
    pinned: false,
    createdAt: now,
    lastUsedAt: now,
    linkCount: 0,
    cover: [],
    ...overrides,
  };
}
