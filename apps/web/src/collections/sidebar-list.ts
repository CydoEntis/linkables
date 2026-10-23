import type { ListedCollection } from "@linkables/shared/collections";
import { matchingCollections } from "./picker";

export const RECENT_COUNT = 6;

type SidebarListOptions = { showAll: boolean; query: string; activeId: string | undefined };

// The six most recent (pinned first, as the API orders them); the open collection
// stays visible even when it is not among them.
export function sidebarList(collections: readonly ListedCollection[], { showAll, query, activeId }: SidebarListOptions): ListedCollection[] {
  if (showAll) return matchingCollections(collections, query);
  const recent = collections.slice(0, RECENT_COUNT);
  const active = collections.find((collection) => collection.id === activeId);
  return active && !recent.includes(active) ? [...recent, active] : recent;
}
