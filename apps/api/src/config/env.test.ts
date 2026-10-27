import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const VALID = { APP_ORIGIN: "http://localhost:5173", AUTH_SECRET: "a-strong-secret-with-at-least-32-characters" };

describe("self-hosted configuration", () => {
  it("needs no hosted database or email service", () => {
    const result = parseEnv(VALID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.databaseUrl).toBe("file:./data/linkables.db");
      expect(result.config.corsOrigins).toEqual([VALID.APP_ORIGIN]);
      expect(result.config.resendApiKey).toBeUndefined();
    }
  });
  it.each(["APP_ORIGIN", "AUTH_SECRET"])("requires %s", (name) => {
    const result = parseEnv(Object.fromEntries(Object.entries(VALID).filter(([key]) => key !== name)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(name);
  });
  it.each(["postgres://host/db", "https://database.example", ""])("rejects a nonlocal SQLite URL %s", (url) => {
    expect(parseEnv({ ...VALID, DATABASE_URL: url }).ok).toBe(false);
  });
  it("accepts Chrome and Firefox extension origins", () => {
    const origins = "chrome-extension://abcdefghijklmnopabcdefghijklmnop,moz-extension://b0dc8e29-ff31-4c46-8b68-d7378b2ae941";
    const result = parseEnv({ ...VALID, CORS_ORIGINS: origins });
    expect(result.ok && result.config.corsOrigins).toEqual([VALID.APP_ORIGIN, ...origins.split(",")]);
  });
  it("does not echo secret values on invalid configuration", () => {
    const result = parseEnv({ ...VALID, AUTH_SECRET: "private" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).not.toContain("private");
  });
  it("has no implicit mail sender or owner recipient", () => {
    const result = parseEnv({ ...VALID, RESEND_API_KEY: "re_selfhost" });
    expect(result.ok && result.config.mailFrom).toBeUndefined();
    expect(result.ok && result.config.ownerEmail).toBeUndefined();
  });
  it("accepts an instance's mail identities without any hosted service address", () => {
    const result = parseEnv({ ...VALID, MAIL_FROM: "links@selfhost.example", OWNER_EMAIL: "admin@selfhost.example" });
    expect(result.ok && result.config.mailFrom).toBe("links@selfhost.example");
    expect(result.ok && result.config.ownerEmail).toBe("admin@selfhost.example");
  });
  it("rejects malformed mail addresses", () => {
    expect(parseEnv({ ...VALID, MAIL_FROM: "not-an-email" }).ok).toBe(false);
  });
});
