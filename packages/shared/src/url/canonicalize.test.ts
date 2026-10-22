import { describe, expect, it } from "vitest";
import { canonicalize, YOUTUBE_HOSTS } from "./index";

function canonical(input: string): string {
  const result = canonicalize(input);
  if (!result.ok) throw new Error(`expected ok for ${input}, got ${result.reason}`);
  return result.url;
}

describe("canonicalize", () => {
  it.each([
    ["https://example.com/a?utm_source=x&utm_medium=y&id=1", "https://example.com/a?id=1"],
    ["https://example.com/a?fbclid=abc", "https://example.com/a"],
    ["https://example.com/a?gclid=abc&q=1", "https://example.com/a?q=1"],
  ])("strips tracking params: %s", (input, expected) => {
    expect(canonical(input)).toBe(expected);
  });

  it("keeps unrelated query params in their original order and encoding", () => {
    expect(canonical("https://example.com/?z=1&utm_campaign=c&a=b%20c&flag")).toBe(
      "https://example.com/?z=1&a=b%20c&flag",
    );
  });

  it("keeps id= on ordinary URLs", () => {
    expect(canonical("https://example.com/item?id=42")).toBe("https://example.com/item?id=42");
  });

  it("lowercases the host", () => {
    expect(canonical("https://EXAMPLE.Com/Path")).toBe("https://example.com/Path");
  });

  it("converts an IDN host to punycode", () => {
    expect(canonical("https://Bücher.example/")).toBe("https://xn--bcher-kva.example/");
  });

  it.each([
    ["https://example.com:443/a", "https://example.com/a"],
    ["http://example.com:80/a", "http://example.com/a"],
  ])("drops the default port: %s", (input, expected) => {
    expect(canonical(input)).toBe(expected);
  });

  it("keeps a non-default port", () => {
    expect(canonical("https://example.com:8443/a")).toBe("https://example.com:8443/a");
  });

  it.each([
    ["http://user:pass@host.example/a", "http://host.example/a"],
    ["https://user@host.example/a", "https://host.example/a"],
  ])("drops credentials: %s", (input, expected) => {
    expect(canonical(input)).toBe(expected);
  });

  it.each([
    ["https://example.com./a", "https://example.com/a"],
    ["https://WWW.YOUTUBE.COM./watch?v=abc", "https://www.youtube.com/watch?v=abc"],
  ])("drops one trailing dot from the host: %s", (input, expected) => {
    expect(canonical(input)).toBe(expected);
  });

  it.each([
    ["https://example.com/?UTM_SOURCE=x&a=1", "https://example.com/?a=1"],
    ["https://example.com/?utm%5Fsource=x&a=1", "https://example.com/?a=1"],
    ["https://example.com/?Fbclid=x&a=1", "https://example.com/?a=1"],
  ])("strips tracking params regardless of case or encoding: %s", (input, expected) => {
    expect(canonical(input)).toBe(expected);
  });

  it("keeps a param whose key is not valid percent-encoding", () => {
    expect(canonical("https://example.com/?%E0%A4%A=1")).toBe("https://example.com/?%E0%A4%A=1");
  });

  it("drops the fragment", () => {
    expect(canonical("https://example.com/a?b=1#section")).toBe("https://example.com/a?b=1");
  });

  it("adds a root path to a bare host and leaves other trailing slashes alone", () => {
    expect(canonical("https://example.com")).toBe("https://example.com/");
    expect(canonical("https://example.com/a/")).toBe("https://example.com/a/");
  });

  it.each([
    ["https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc&t=42", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/abc123", "https://www.youtube.com/watch?v=abc123"],
    ["https://youtube.com/shorts/abc123?feature=share", "https://www.youtube.com/watch?v=abc123"],
  ])("rewrites short YouTube forms to watch?v=: %s", (input, expected) => {
    expect(canonical(input)).toBe(expected);
  });

  it.each([
    ["https://m.youtube.com/watch?v=abc", "https://www.youtube.com/watch?v=abc"],
    ["https://youtube.com/watch?v=abc", "https://www.youtube.com/watch?v=abc"],
    ["https://YouTube.com/@channel", "https://www.youtube.com/@channel"],
  ])("normalises YouTube hosts to www.youtube.com: %s", (input, expected) => {
    expect(canonical(input)).toBe(expected);
  });

  it("keeps only v on watch URLs", () => {
    expect(
      canonical("https://www.youtube.com/watch?list=PL1&v=abc&si=x&t=10s&feature=share&utm_source=y"),
    ).toBe("https://www.youtube.com/watch?v=abc");
  });

  it("treats an empty v like a missing v so different playlists keep different keys", () => {
    expect(canonical("https://www.youtube.com/watch?v=&list=PL1&utm_source=x")).toBe(
      "https://www.youtube.com/watch?v=&list=PL1",
    );
    expect(canonical("https://www.youtube.com/watch?v=&list=PL2")).toBe(
      "https://www.youtube.com/watch?v=&list=PL2",
    );
  });

  it.each([
    ["https://youtu.be/a%20b", "https://youtu.be/a%20b"],
    ["https://www.youtube.com/shorts/a%20b", "https://www.youtube.com/shorts/a%20b"],
  ])("leaves YouTube links with an invalid video id as ordinary pages: %s", (input, expected) => {
    expect(canonical(input)).toBe(expected);
  });

  it.each(["ftp://example.com/file", "javascript:alert(1)", "mailto:a@example.com"])(
    "rejects a non-http scheme: %s",
    (input) => {
      expect(canonicalize(input)).toEqual({ ok: false, reason: "unsupported_protocol" });
    },
  );

  it("rejects a string that is not a URL", () => {
    expect(canonicalize("not a url")).toEqual({ ok: false, reason: "invalid_url" });
  });
});

describe("YOUTUBE_HOSTS", () => {
  it("contains every host canonicalize treats as YouTube", () => {
    expect([...YOUTUBE_HOSTS].sort()).toEqual(
      ["m.youtube.com", "www.youtube.com", "youtu.be", "youtube.com"].sort(),
    );
  });
});
