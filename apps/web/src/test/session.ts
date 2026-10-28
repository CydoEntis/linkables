import { vi } from "vitest";
import { rememberSession, type Session } from "../auth/session";

export function session(accessToken = "token-1"): Session {
  return {
    token: accessToken,
    expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    user: { id: "0b6e2f3a-5c1d-4e8f-9a2b-3c4d5e6f7a81", email: "user@example.com", name: "User" },
  };
}

export function storeSession(accessToken: string): void { rememberSession(session(accessToken)); }

export function stubAuthServer(): void {
  vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({
    ok: true, data: null, meta: { requestId: crypto.randomUUID(), ms: 1, version: "v1" },
  }), { headers: { "Content-Type": "application/json" } }))));
}
