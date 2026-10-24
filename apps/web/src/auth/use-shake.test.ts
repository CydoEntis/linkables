import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useShake } from "./use-shake";

afterEach(() => {
  vi.restoreAllMocks();
});

it("marks the field as shaking", () => {
  const { result } = renderHook(() => useShake());
  act(() => { result.current.shake(); });
  expect(result.current.fieldProps["data-shaking"]).toBe(true);
});

it("does not shake when the user prefers reduced motion", () => {
  vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
  const { result } = renderHook(() => useShake());
  act(() => { result.current.shake(); });
  expect(result.current.fieldProps["data-shaking"]).toBeUndefined();
});
