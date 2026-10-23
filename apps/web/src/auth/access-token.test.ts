import type { Session } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import { peekAccessToken, rememberSession } from "./access-token";

const now = Date.parse("2026-10-23T10:00:00Z");

function session(expiresInSeconds: number): Session {
  return { access_token: "held", expires_at: now / 1000 + expiresInSeconds } as Session;
}

afterEach(() => { rememberSession(null); });

describe("peekAccessToken", () => {
  it("returns the held token while it has more than a minute left", () => {
    rememberSession(session(600));
    expect(peekAccessToken(now)).toBe("held");
  });

  it("returns nothing for a token about to expire, so the caller waits for a fresh one", () => {
    rememberSession(session(30));
    expect(peekAccessToken(now)).toBeNull();
  });

  it("returns nothing after sign-out", () => {
    rememberSession(session(600));
    rememberSession(null);
    expect(peekAccessToken(now)).toBeNull();
  });
});
