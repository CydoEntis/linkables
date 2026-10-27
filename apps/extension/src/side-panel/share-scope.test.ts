import type { ShareState } from "@linkables/shared/sharing";
import { describe, expect, it } from "vitest";
import { scopeRequest, scopeSummary, withGroupShared, withUngroupedShared } from "./share-scope";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const state: ShareState = {
  token: null,
  ungrouped: true,
  groups: [
    { id: A, name: "Mains", shared: true },
    { id: B, name: "Desserts", shared: false },
  ],
};

describe("scopeRequest", () => {
  it("lists the shared groups and whether the ungrouped links are shared", () => {
    expect(scopeRequest(state)).toEqual({ ungrouped: true, groupIds: [A] });
  });

  it("shares the ungrouped links and no groups for a collection that sent neither", () => {
    expect(scopeRequest({ token: null })).toEqual({ ungrouped: true, groupIds: [] });
  });
});

describe("changing the scope", () => {
  it("unticks the ungrouped links without touching the groups", () => {
    expect(scopeRequest(withUngroupedShared(state, false))).toEqual({ ungrouped: false, groupIds: [A] });
  });

  it("ticks one group and leaves the others as they were", () => {
    expect(scopeRequest(withGroupShared(state, B, true))).toEqual({ ungrouped: true, groupIds: [A, B] });
  });

  it("builds on the latest state, so quick ticks add up", () => {
    const next = withGroupShared(withGroupShared(state, A, false), B, true);
    expect(scopeRequest(next)).toEqual({ ungrouped: true, groupIds: [B] });
  });
});

describe("scopeSummary", () => {
  it("counts the shared groups", () => {
    expect(scopeSummary(state.groups ?? [])).toBe("1 of 2 groups shared");
  });

  it("says group, not groups, for a single one", () => {
    expect(scopeSummary([{ id: A, name: "Mains", shared: true }])).toBe("1 of 1 group shared");
  });
});
