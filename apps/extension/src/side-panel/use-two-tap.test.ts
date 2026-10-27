import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTwoTap } from "./use-two-tap";

describe("useTwoTap", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("confirms only on the second tap", () => {
    const confirm = vi.fn();
    const { result } = renderHook(() => useTwoTap(confirm, false));

    act(() => { result.current.press(); });
    expect(result.current.armed).toBe(true);
    expect(confirm).not.toHaveBeenCalled();

    act(() => { result.current.press(); });
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("disarms after 3.5 s", () => {
    const confirm = vi.fn();
    const { result } = renderHook(() => useTwoTap(confirm, false));

    act(() => { result.current.press(); });
    act(() => { vi.advanceTimersByTime(3500); });
    expect(result.current.armed).toBe(false);
  });

  it("ignores taps while the last one is still working", () => {
    const confirm = vi.fn();
    const { result } = renderHook(() => useTwoTap(confirm, true));

    act(() => { result.current.press(); });
    expect(result.current.armed).toBe(false);
  });
});
