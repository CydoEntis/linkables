import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCopy } from "./use-copy";

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

describe("useCopy", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("copies the text and says so for a moment", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard(writeText);
    const { result } = renderHook(() => useCopy());

    await act(() => result.current.copy("https://example.com/a"));
    expect(writeText).toHaveBeenCalledWith("https://example.com/a");
    expect(result.current.state).toBe("copied");

    act(() => { vi.advanceTimersByTime(1800); });
    expect(result.current.state).toBe("idle");
  });

  it("says it could not copy when the browser refuses", async () => {
    stubClipboard(() => Promise.reject(new DOMException("Document is not focused", "NotAllowedError")));
    const { result } = renderHook(() => useCopy());

    await act(() => result.current.copy("https://example.com/a"));
    expect(result.current.state).toBe("failed");
  });
});
