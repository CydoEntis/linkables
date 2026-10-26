import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { usePin } from "./use-pin";

const request = vi.hoisted(() => vi.fn());
vi.mock("../api/api", () => ({ api: { request } }));

const LINK_ID = "6f1c8f4e-2b7a-4c1d-9e0f-3a5b7c9d1e2f";

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("usePin", () => {
  it("shows a pin the server reports later, such as one made in the web app", () => {
    const { result, rerender } = renderHook(({ initial }) => usePin(LINK_ID, initial), { wrapper, initialProps: { initial: false } });
    expect(result.current.pinned).toBe(false);

    rerender({ initial: true });
    expect(result.current.pinned).toBe(true);
  });

  it("keeps a later change on its way when the server confirms an earlier one", async () => {
    const answers: ((link: { pinned: boolean }) => void)[] = [];
    request.mockImplementation(() => new Promise((resolve) => { answers.push(resolve); }));
    const { result, rerender } = renderHook(({ initial }) => usePin(LINK_ID, initial), { wrapper, initialProps: { initial: false } });

    act(() => { result.current.toggle(); });
    act(() => { result.current.toggle(); });
    await act(() => {
      answers[0]?.({ pinned: true });
      return Promise.resolve();
    });
    rerender({ initial: true });
    expect(result.current.pinned).toBe(false);
  });
});
