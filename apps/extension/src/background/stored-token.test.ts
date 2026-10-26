import { describe, expect, it } from "vitest";
import { usableAccessToken } from "./stored-token";

const now = Date.parse("2026-10-26T12:00:00.000Z");
const stored = (expiresInSeconds: number) =>
  JSON.stringify({ access_token: "token-1", refresh_token: "r", expires_at: Math.floor(now / 1000) + expiresInSeconds });

describe("usableAccessToken", () => {
  it("uses the stored access token while it is still good", () => {
    expect(usableAccessToken(stored(600), now)).toBe("token-1");
  });

  it("refuses a token that expires within a minute, which only a refresh could replace", () => {
    expect(usableAccessToken(stored(30), now)).toBeNull();
  });

  it("finds nothing when no one is signed in", () => {
    expect(usableAccessToken(undefined, now)).toBeNull();
  });

  it("finds nothing in a stored value it can't read", () => {
    expect(usableAccessToken("{not json", now)).toBeNull();
  });
});
