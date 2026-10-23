import { describe, expect, it } from "vitest";
import { parseWebEnv } from "./env";

const BASE = {
  VITE_SUPABASE_URL: "http://supabase.test",
  VITE_SUPABASE_ANON_KEY: "anon",
  VITE_API_URL: "http://api.test",
  VITE_AUTH_REDIRECT_URL: "http://localhost:5173/",
};

describe("VITE_IOS_SHORTCUT_URL", () => {
  it("is optional", () => {
    expect(parseWebEnv(BASE).VITE_IOS_SHORTCUT_URL).toBeUndefined();
  });

  it("treats an empty value as unset", () => {
    expect(parseWebEnv({ ...BASE, VITE_IOS_SHORTCUT_URL: "" }).VITE_IOS_SHORTCUT_URL).toBeUndefined();
  });

  it("keeps an https link", () => {
    const url = "https://www.icloud.com/shortcuts/abc123";
    expect(parseWebEnv({ ...BASE, VITE_IOS_SHORTCUT_URL: url }).VITE_IOS_SHORTCUT_URL).toBe(url);
  });

  it("rejects anything that is not an https link", () => {
    expect(() => parseWebEnv({ ...BASE, VITE_IOS_SHORTCUT_URL: "not a link" })).toThrow("VITE_IOS_SHORTCUT_URL");
    expect(() => parseWebEnv({ ...BASE, VITE_IOS_SHORTCUT_URL: "javascript:alert(1)" })).toThrow("VITE_IOS_SHORTCUT_URL");
  });

  it("rejects an https link without a real host name", () => {
    expect(() => parseWebEnv({ ...BASE, VITE_IOS_SHORTCUT_URL: "https://icloud" })).toThrow("VITE_IOS_SHORTCUT_URL");
    expect(() => parseWebEnv({ ...BASE, VITE_IOS_SHORTCUT_URL: "https://" })).toThrow("VITE_IOS_SHORTCUT_URL");
  });
});
