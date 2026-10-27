import { afterEach, expect, it } from "vitest";
import { peekAccessToken } from "./access-token";
import { rememberSession } from "./session";
import { session } from "../test/session";

afterEach(() => { rememberSession(null); });

it("holds a usable token in memory", () => {
  rememberSession(session("held"));
  expect(peekAccessToken()).toBe("held");
});

it("does not send a token about to expire", () => {
  rememberSession({ ...session("held"), expiresAt: new Date(Date.now() + 30_000).toISOString() });
  expect(peekAccessToken()).toBeNull();
});

it("forgets the token after sign-out", () => {
  rememberSession(session("held"));
  rememberSession(null);
  expect(peekAccessToken()).toBeNull();
});
