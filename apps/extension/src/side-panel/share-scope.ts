import type { ShareGroup, ShareScopeRequest, ShareState } from "@linkables/shared/sharing";

// The API sends ungrouped and groups only for a collection that has groups.
export function scopeRequest({ ungrouped = true, groups = [] }: ShareState): ShareScopeRequest {
  return { ungrouped, groupIds: groups.filter((group) => group.shared).map((group) => group.id) };
}

export function withUngroupedShared(state: ShareState, shared: boolean): ShareState {
  return { ...state, ungrouped: shared };
}

export function withGroupShared(state: ShareState, groupId: string, shared: boolean): ShareState {
  return { ...state, groups: state.groups?.map((group) => (group.id === groupId ? { ...group, shared } : group)) };
}

export function scopeSummary(groups: readonly ShareGroup[]): string {
  const shared = groups.filter((group) => group.shared).length;
  return `${String(shared)} of ${String(groups.length)} ${groups.length === 1 ? "group" : "groups"} shared`;
}
