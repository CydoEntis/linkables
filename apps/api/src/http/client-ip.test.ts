import { describe, expect, it } from "vitest";
import { addressKey } from "./client-ip";

describe("addressKey", () => {
  it("keeps an IPv4 address whole", () => {
    expect(addressKey("203.0.113.7")).toBe("203.0.113.7");
  });

  it("keys an IPv6 address by its /64", () => {
    expect(addressKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd")).toBe("2001:db8:1:2::/64");
  });

  it("gives every address in one /64 the same key", () => {
    expect(addressKey("2001:db8:1:2::1")).toBe(addressKey("2001:DB8:1:2:ffff:ffff:ffff:ffff"));
  });

  it("expands a compressed prefix", () => {
    expect(addressKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
  });

  it("reads an IPv4-mapped address as IPv4", () => {
    expect(addressKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
  });

  it("passes through text that is not an address", () => {
    expect(addressKey("unknown")).toBe("unknown");
  });
});
