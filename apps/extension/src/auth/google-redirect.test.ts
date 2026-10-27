import { describe, expect, it } from "vitest";
import { readGoogleRedirect } from "./google-redirect";

const REDIRECT = "https://ekgbmopoceccloaibfknnbnohkpbkili.chromiumapp.org/";

describe("readGoogleRedirect", () => {
  it("reads the PKCE code from the query", () => {
    expect(readGoogleRedirect(`${REDIRECT}?code=abc-123`)).toEqual({ kind: "code", code: "abc-123" });
  });

  it("reads a cancelled sign-in from the query", () => {
    expect(readGoogleRedirect(`${REDIRECT}?error=access_denied&error_description=The+user+cancelled`)).toEqual({
      kind: "error",
      error: "access_denied",
      description: "The user cancelled",
    });
  });

  it("reads an error Supabase put in the hash", () => {
    expect(readGoogleRedirect(`${REDIRECT}#error=server_error&error_code=unexpected_failure`)).toEqual({
      kind: "error",
      error: "server_error",
      description: undefined,
    });
  });

  it("prefers the error when a redirect carries both", () => {
    expect(readGoogleRedirect(`${REDIRECT}?code=abc&error=access_denied`)).toMatchObject({ kind: "error", error: "access_denied" });
  });

  it("treats a redirect with neither as a failure", () => {
    expect(readGoogleRedirect(REDIRECT)).toEqual({ kind: "error", error: "no_code", description: undefined });
  });

  it("treats no redirect at all as a failure", () => {
    expect(readGoogleRedirect(undefined)).toEqual({ kind: "error", error: "no_code", description: undefined });
  });
});
