import { UNGROUPED, type Group } from "@linkables/shared/groups";

export type GroupSection = { id: string; title: string; linkCount: number; shared: boolean };

// What a collection's heading list shows: the ungrouped links first, then each group in
// position order. The ungrouped count is what the groups leave of the collection's total.
export function groupSections(groups: readonly Group[], linkCount: number): GroupSection[] {
  if (groups.length === 0) return [];
  const ungrouped = Math.max(0, linkCount - groups.reduce((total, group) => total + group.linkCount, 0));
  return [
    ...(ungrouped > 0 ? [{ id: UNGROUPED, title: "Ungrouped", linkCount: ungrouped, shared: true }] : []),
    ...groups.map((group) => ({ id: group.id, title: group.name, linkCount: group.linkCount, shared: group.shared })),
  ];
}

export function collectionLinksPath(collectionId: string, groupId: string | undefined, limit: number): string {
  const params = new URLSearchParams({ collectionId });
  if (groupId !== undefined) params.set("groupId", groupId);
  params.set("limit", String(limit));
  return `/links?${params.toString()}`;
}
