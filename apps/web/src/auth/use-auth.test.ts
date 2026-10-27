import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { rememberSession } from "./session";
import { useAuth } from "./use-auth";
import { session } from "../test/session";

function envelope(data: unknown) {
  return new Response(JSON.stringify({ ok: true, data, meta: { requestId: crypto.randomUUID(), ms: 1, version: "v1" } }));
}
afterEach(() => { rememberSession(null); vi.unstubAllGlobals(); });

it("restores the signed-in user from the cookie session endpoint", async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(envelope(session()))));
  const { result } = renderHook(useAuth);
  await waitFor(() => { expect(result.current.status).toBe("signed-in"); });
});

it("shows a retry state when the server cannot be reached", async () => {
  vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new TypeError("offline"))));
  const { result } = renderHook(useAuth);
  await waitFor(() => { expect(result.current.status).toBe("unavailable"); });
});
