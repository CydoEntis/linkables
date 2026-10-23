import { describe, expect, it, vi } from "vitest";
import type { Db } from "../src/db/client";
import { truncateAll } from "./truncate";

function pgError(code: string) {
  return Object.assign(new Error(`postgres ${code}`), { code });
}

// Drizzle wraps the driver's error, keeping it as `cause`.
function drizzleError(code: string) {
  return new Error("Failed query: truncate ...", { cause: pgError(code) });
}

function fakeDb(run: () => Promise<unknown>) {
  const execute = vi.fn(run);
  // Narrow test double: truncateAll only calls db.execute.
  return { db: { execute } as unknown as Db, execute };
}

describe("truncateAll", () => {
  it("tries again when Postgres picks the truncate as a deadlock victim", async () => {
    let calls = 0;
    const { db, execute } = fakeDb(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(drizzleError("40P01")) : Promise.resolve();
    });

    await truncateAll(db);

    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("does not retry other errors", async () => {
    const { db, execute } = fakeDb(() => Promise.reject(drizzleError("42P01")));

    await expect(truncateAll(db)).rejects.toThrow("Failed query");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("gives up after a few deadlocks in a row", async () => {
    const { db, execute } = fakeDb(() => Promise.reject(drizzleError("40P01")));

    await expect(truncateAll(db)).rejects.toThrow("Failed query");
    expect(execute).toHaveBeenCalledTimes(3);
  });
});
