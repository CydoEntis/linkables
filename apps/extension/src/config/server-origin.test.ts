import { expect, it } from "vitest";
import { hostPermission, serverOriginSchema } from "./server-origin";

it("accepts a private HTTPS Tailscale server and strips a trailing slash", () => {
  expect(serverOriginSchema.parse(" https://linkables.tail123.ts.net/ ")).toBe("https://linkables.tail123.ts.net");
});

it.each(["http://example.com", "https://example.com/path", "https://user:pass@example.com", "https://example.com?secret=a", "javascript:alert(1)"])("rejects an unsafe or non-origin server address %s", (value) => {
  expect(serverOriginSchema.safeParse(value).success).toBe(false);
});

it("permits local HTTP development and requests only its host", () => {
  expect(hostPermission(serverOriginSchema.parse("http://127.0.0.1:3000"))).toBe("http://127.0.0.1/*");
});
