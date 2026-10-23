import { URL_MAX_LENGTH } from "@linkables/shared/links";
import { describe, expect, it } from "vitest";
import { ApiError, NETWORK_ERROR } from "../api/client";
import { saveLinkFormSchema, saveProblem } from "./save-link-form";

function parse(url: string) {
  const result = saveLinkFormSchema.safeParse({ url });
  return result.success ? { url: result.data.url } : { error: result.error.issues[0]?.message };
}

describe("saveLinkFormSchema", () => {
  it("accepts an http or https link, trimmed", () => {
    expect(parse("  https://example.com/a ")).toEqual({ url: "https://example.com/a" });
    expect(parse("http://example.com")).toEqual({ url: "http://example.com" });
  });

  it("adds https:// to a bare domain", () => {
    expect(parse("youtube.com/watch?v=abc")).toEqual({ url: "https://youtube.com/watch?v=abc" });
  });

  it("rejects text that is not a web link", () => {
    expect(parse("rust ownership")).toEqual({ error: "Links must start with http:// or https://" });
    expect(parse("ftp://example.com/file")).toEqual({ error: "Links must start with http:// or https://" });
  });

  it("rejects a link over the length limit", () => {
    expect(parse(`https://example.com/${"a".repeat(URL_MAX_LENGTH)}`)).toEqual({ error: "That link is too long." });
  });
});

describe("saveProblem", () => {
  it("puts a rejected link under the field", () => {
    expect(saveProblem(new ApiError("VALIDATION", "url must be a valid URL"))).toEqual({
      kind: "inline",
      message: "Links must start with http:// or https://",
    });
  });

  it("toasts rate limits and lost connections", () => {
    expect(saveProblem(new ApiError("RATE_LIMIT", "Too many saves"))).toEqual({
      kind: "toast",
      message: "Too many saves. Wait a minute.",
    });
    expect(saveProblem(new ApiError(NETWORK_ERROR, "Could not reach the server"))).toEqual({
      kind: "toast",
      message: "You're offline. The link wasn't saved.",
    });
  });

  it("says nothing when the session ended, because sign-in takes over", () => {
    expect(saveProblem(new ApiError("UNAUTHENTICATED", "Sign in"))).toEqual({ kind: "none" });
  });
});
