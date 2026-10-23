import { describe, expect, it } from "vitest";
import { checkTestDatabaseUrl } from "./db-setup";

describe("checkTestDatabaseUrl", () => {
  it("accepts a local database whose name ends in _test", () => {
    const url = "postgres://postgres:postgres@localhost:5432/linkables_test";

    expect(checkTestDatabaseUrl(url)).toBe(url);
  });

  it("refuses a database whose name does not end in _test", () => {
    expect(() => checkTestDatabaseUrl("postgres://postgres:postgres@localhost:5432/linkables")).toThrow(
      /must end in _test/,
    );
  });

  it.each([
    "postgresql://postgres.ref:pw@aws-0-eu-west-1.pooler.supabase.com:5432/linkables_test",
    "postgresql://postgres:pw@db.ref.supabase.co:5432/linkables_test",
  ])("refuses a Supabase host: %s", (url) => {
    expect(() => checkTestDatabaseUrl(url)).toThrow(/Supabase/);
  });

  it("refuses a value that is not a URL", () => {
    expect(() => checkTestDatabaseUrl("linkables_test")).toThrow(/not a valid URL/);
  });
});
