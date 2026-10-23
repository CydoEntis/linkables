import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { REVOKE_AFTER_MS, useExportLinks } from "./use-export-links";

const request = vi.hoisted(() => vi.fn());
vi.mock("../api/api", () => ({ api: { request } }));

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useExportLinks", () => {
  it("keeps the download's object URL alive for a few seconds before revoking it", async () => {
    vi.useFakeTimers();
    const revoke = vi.fn();
    vi.stubGlobal(
      "URL",
      class extends URL {
        static override createObjectURL = () => "blob:export";
        static override revokeObjectURL = revoke;
      },
    );
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    request.mockResolvedValue({ version: 1, exportedAt: "2026-10-22T10:00:00.000Z", links: [], collections: [] });
    const { result } = renderHook(() => useExportLinks());

    await act(() => result.current());
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(revoke).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(REVOKE_AFTER_MS));
    expect(revoke).toHaveBeenCalledWith("blob:export");
  });
});
