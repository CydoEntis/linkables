import { describe, expect, it } from "vitest";
import { checkTestDatabaseUrl } from "./db-setup";

describe("test database safety", () => {
  it("accepts only a local SQLite path explicitly named as a test database", () => {
    expect(checkTestDatabaseUrl("file:./library_test.db")).toBe("file:./library_test.db");
  });
  it.each(["file:./library.db", "postgres://localhost/library_test", "libsql://example/library_test.db", "library_test.db"])("refuses unsafe path %s", (url) => {
    expect(() => checkTestDatabaseUrl(url)).toThrow("local file:");
  });
});
