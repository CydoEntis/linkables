import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useLinksUi } from "./links-ui-store";
import { savedLink } from "./test-links";
import { useHeldRow } from "./use-held-row";

const [a, b, c] = [savedLink(), savedLink(), savedLink()];

afterEach(() => { useLinksUi.setState({ heldId: null, leavingIds: [] }); });

describe("useHeldRow", () => {
  it("keeps a held row in its place after a refetch drops it", () => {
    useLinksUi.setState({ heldId: b.id });
    const { result, rerender } = renderHook(({ links }) => useHeldRow(links), { initialProps: { links: [a, b, c] } });
    rerender({ links: [a, c] });
    expect(result.current.map((link) => link.id)).toEqual([a.id, b.id, c.id]);
  });

  it("lets the row go once it is neither held nor leaving", () => {
    useLinksUi.setState({ heldId: b.id });
    const { result, rerender } = renderHook(({ links }) => useHeldRow(links), { initialProps: { links: [a, b, c] } });
    rerender({ links: [a, c] });
    act(() => { useLinksUi.setState({ heldId: null }); });
    expect(result.current.map((link) => link.id)).toEqual([a.id, c.id]);
  });
});
