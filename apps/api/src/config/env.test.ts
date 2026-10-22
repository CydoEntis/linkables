import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const VALID = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://postgres.ref:db-secret@pooler.example.com:6543/postgres",
  MIGRATION_DATABASE_URL: "postgresql://postgres.ref:db-secret@pooler.example.com:5432/postgres",
  SUPABASE_URL: "https://ref.supabase.co",
  CORS_ORIGINS: "http://localhost:5173, https://app.example.com",
  WORKER_ENABLED: "false",
};

function without(key: keyof typeof VALID) {
  return Object.fromEntries(Object.entries(VALID).filter(([name]) => name !== key));
}

describe("parseEnv", () => {
  it("parses a valid env into config with defaults and derived auth URLs", () => {
    const result = parseEnv(VALID);

    expect(result).toEqual({
      ok: true,
      config: {
        nodeEnv: "development",
        port: 3000,
        logLevel: "info",
        corsOrigins: ["http://localhost:5173", "https://app.example.com"],
        workerEnabled: false,
        databaseUrl: VALID.DATABASE_URL,
        migrationDatabaseUrl: VALID.MIGRATION_DATABASE_URL,
        auth: {
          issuer: "https://ref.supabase.co/auth/v1",
          jwksUrl: "https://ref.supabase.co/auth/v1/.well-known/jwks.json",
          testJwks: undefined,
        },
      },
    });
  });

  it.each(Object.keys(VALID) as (keyof typeof VALID)[])("fails naming %s when it is missing", (key) => {
    const result = parseEnv(without(key));

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain(key);
  });

  it("fails when NODE_ENV is not a known mode", () => {
    const result = parseEnv({ ...VALID, NODE_ENV: "staging" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("NODE_ENV");
  });

  it("fails naming AUTH_TEST_JWKS when it is set with NODE_ENV=production", () => {
    const result = parseEnv({ ...VALID, NODE_ENV: "production", AUTH_TEST_JWKS: '{"keys":[]}' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("AUTH_TEST_JWKS");
  });

  it("accepts AUTH_TEST_JWKS with NODE_ENV=test", () => {
    const result = parseEnv({ ...VALID, NODE_ENV: "test", AUTH_TEST_JWKS: '{"keys":[]}' });

    expect(result.ok && result.config.auth.testJwks).toBe('{"keys":[]}');
  });

  it("rejects a CORS entry that is not a bare origin", () => {
    const result = parseEnv({ ...VALID, CORS_ORIGINS: "http://localhost:5173/" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("CORS_ORIGINS");
  });

  it("never echoes a variable's value in the failure message", () => {
    const result = parseEnv({ ...VALID, DATABASE_URL: "not a url db-secret", PORT: "db-secret" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("DATABASE_URL");
      expect(result.message).not.toContain("db-secret");
    }
  });
});
