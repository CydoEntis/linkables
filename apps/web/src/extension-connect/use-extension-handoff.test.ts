import { ApiError } from "@linkables/shared/api-client";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useExtensionHandoff } from "./use-extension-handoff";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

// The hook remembers every nonce for the page's lifetime, so each test makes its own.
const newNonce = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");

let posted: unknown[] = [];

function fromExtension(data: unknown, { origin = window.location.origin, source = window }: { origin?: string; source?: MessageEventSource | null } = {}) {
  act(() => { window.dispatchEvent(new MessageEvent("message", { data, origin, source })); });
}

const hello = (nonce: string) => ({ type: "linkables:extension-hello", nonce });

beforeEach(() => {
  posted = [];
  vi.spyOn(window, "postMessage").mockImplementation((message: unknown, targetOrigin?: unknown) => {
    posted.push({ message, targetOrigin });
  });
  request.mockReset().mockResolvedValue({ tokenHash: "hash-1" });
});

afterEach(() => { vi.restoreAllMocks(); });

describe("useExtensionHandoff", () => {
  it("asks the extension, on this page's origin only, whether it wants a session", () => {
    renderHook(() => { useExtensionHandoff(true, false); });

    expect(posted).toEqual([{ message: { type: "linkables:extension-ping" }, targetOrigin: window.location.origin }]);
  });

  it("answers a hello with a token minted for the signed-in user", async () => {
    const nonce = newNonce();
    renderHook(() => { useExtensionHandoff(true, false); });

    fromExtension(hello(nonce));

    await waitFor(() => {
      expect(posted).toContainEqual({
        message: { type: "linkables:extension-session", nonce, tokenHash: "hash-1" },
        targetOrigin: window.location.origin,
      });
    });
    expect(request).toHaveBeenCalledExactlyOnceWith("/extension-sessions", expect.anything(), { method: "POST" });
  });

  it("answers each nonce once", async () => {
    const [nonce, other] = [newNonce(), newNonce()];
    renderHook(() => { useExtensionHandoff(true, false); });

    fromExtension(hello(nonce));
    fromExtension(hello(nonce));
    fromExtension(hello(other));

    await waitFor(() => { expect(request).toHaveBeenCalledTimes(2); });
  });

  it.each([
    ["another origin", { origin: "https://evil.example" }],
    ["another window", { source: null }],
  ])("ignores a hello from %s", (_case, from) => {
    renderHook(() => { useExtensionHandoff(true, false); });

    fromExtension(hello(newNonce()), from);

    expect(request).not.toHaveBeenCalled();
  });

  it("ignores a malformed hello", () => {
    renderHook(() => { useExtensionHandoff(true, false); });

    fromExtension({ type: "linkables:extension-hello", nonce: "short" });

    expect(request).not.toHaveBeenCalled();
  });

  it("does nothing while signed out", () => {
    renderHook(() => { useExtensionHandoff(false, false); });

    fromExtension(hello(newNonce()));

    expect(posted).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it("asks again on arriving at the connect page", () => {
    const { rerender } = renderHook(({ onConnectPage }) => { useExtensionHandoff(true, onConnectPage); }, {
      initialProps: { onConnectPage: false },
    });

    rerender({ onConnectPage: true });

    expect(posted).toHaveLength(2);
  });

  it("tells the page the hand-off failed when no token can be minted", async () => {
    request.mockRejectedValue(new ApiError("UPSTREAM", "unavailable"));
    renderHook(() => { useExtensionHandoff(true, false); });

    fromExtension(hello(newNonce()));

    await waitFor(() => {
      expect(posted).toContainEqual({ message: { type: "linkables:extension-connected", ok: false }, targetOrigin: window.location.origin });
    });
  });
});
