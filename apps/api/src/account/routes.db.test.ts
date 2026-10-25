import { failureEnvelopeSchema, successEnvelopeSchema } from "@linkables/shared/http";
import { count, eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { mintToken } from "../../test/auth/tokens";
import { captureLogger, createTestApp, TEST_SUPABASE_URL, testUsers, type TestUser } from "../../test/app";
import { connectTestDb, truncateAll } from "../../test/db";
import type { NotifyAccountDeleted } from "../access/notify-owner";
import { collection, collectionItem, resource, savedLink } from "../db/schema";

const { db, close } = connectTestDb();
const { a, b } = await testUsers();

afterAll(close);
beforeEach(() => truncateAll(db));

const NOW = Date.UTC(2026, 9, 25, 12);
const A_EMAIL = "sam@example.com";
const A_TOKEN = "Shared_Token-For-Delete-0123456_";

function deleteAccount(app: ReturnType<typeof createTestApp>, headers: Record<string, string>) {
  return app.request("/api/v1/me", { method: "DELETE", headers });
}

async function withEmail(user: TestUser, email: string) {
  const token = await mintToken({ sub: user.id, supabaseUrl: TEST_SUPABASE_URL, claims: { email } });
  return { Authorization: `Bearer ${token}` };
}

// Each user saves the same page, files it in a shared collection, and has a second empty one.
async function seedUser(userId: string, shareToken: string, resourceId: string) {
  const [link] = await db
    .insert(savedLink)
    .values({ userId, resourceId, originalUrl: "https://example.com/page", note: "a note", pinned: true })
    .returning();
  const [shared, empty] = await db
    .insert(collection)
    .values([
      { userId, name: "Trip", shareToken },
      { userId, name: "Later" },
    ])
    .returning();
  if (link === undefined || shared === undefined || empty === undefined) throw new Error("seed failed");
  await db.insert(collectionItem).values({ collectionId: shared.id, savedLinkId: link.id });
}

async function seedBoth() {
  const [page] = await db.insert(resource).values({ canonicalUrl: "https://example.com/page", title: "Page" }).returning();
  if (page === undefined) throw new Error("no resource");
  await seedUser(a.id, A_TOKEN, page.id);
  await seedUser(b.id, "Shared_Token-For-Other-0123456__", page.id);
}

async function userTables(): Promise<string[]> {
  const rows = await db.execute<{ table_name: string }>(sql`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'user_id'
    order by table_name`);
  return rows.map((row) => row.table_name);
}

// Rows per table with a user_id column, read from the catalog so a table added
// later is counted without this test knowing its name.
async function rowsPerUserTable(userId: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of await userTables()) {
    const [row] = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from ${sql.identifier(table)} where user_id = ${userId}`,
    );
    counts[table] = row?.n ?? 0;
  }
  return counts;
}

async function filingsOf(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(collectionItem)
    .innerJoin(collection, eq(collection.id, collectionItem.collectionId))
    .where(eq(collection.userId, userId));
  return row?.n ?? 0;
}

describe("DELETE /me", () => {
  it("answers 200 with no data", async () => {
    const res = await deleteAccount(createTestApp({ db }), a.headers);

    expect(res.status).toBe(200);
    expect(successEnvelopeSchema(z.null()).parse(await res.json()).data).toBeNull();
  });

  it("empties every table with a user_id column for that user", async () => {
    await seedBoth();
    const before = await rowsPerUserTable(a.id);
    expect(Object.keys(before).length).toBeGreaterThan(0);
    // A table the seed leaves empty would pass below without proving anything.
    for (const [table, n] of Object.entries(before)) expect(n, `seed rows in ${table}`).toBeGreaterThan(0);

    await deleteAccount(createTestApp({ db }), a.headers);

    const after = await rowsPerUserTable(a.id);
    expect(Object.values(after).every((n) => n === 0), JSON.stringify(after)).toBe(true);
    expect(await filingsOf(a.id)).toBe(0);
  });

  it("leaves another user's rows and the shared page details alone", async () => {
    await seedBoth();
    const before = { rows: await rowsPerUserTable(b.id), filings: await filingsOf(b.id) };

    await deleteAccount(createTestApp({ db }), a.headers);

    expect({ rows: await rowsPerUserTable(b.id), filings: await filingsOf(b.id) }).toEqual(before);
    expect(await db.select({ id: resource.id }).from(resource)).toHaveLength(1);
  });

  it("stops the user's shared collection links working", async () => {
    await seedBoth();
    const app = createTestApp({ db });

    await deleteAccount(app, a.headers);

    expect((await app.request(`/api/v1/shared/${A_TOKEN}`)).status).toBe(404);
  });

  it("emails the owner to delete the sign-in account, with the user's id and email", async () => {
    const notifyAccountDeleted = vi.fn<NotifyAccountDeleted>().mockResolvedValue();
    const app = createTestApp({ db, now: () => NOW, notifyAccountDeleted });

    await deleteAccount(app, await withEmail(a, A_EMAIL));

    expect(notifyAccountDeleted).toHaveBeenCalledExactlyOnceWith({ userId: a.id, email: A_EMAIL, at: new Date(NOW) });
  });

  it("warns without naming the user when Resend is not configured", async () => {
    const { logger, lines } = captureLogger();

    await deleteAccount(createTestApp({ db, logger }), await withEmail(a, A_EMAIL));

    expect(lines.join("\n")).toContain("owner not emailed");
    for (const secret of [a.id, A_EMAIL]) expect(lines.join("\n")).not.toContain(secret);
  });

  it("refuses a fourth delete within the hour for the same user, without emailing again", async () => {
    const notifyAccountDeleted = vi.fn<NotifyAccountDeleted>().mockResolvedValue();
    let at = NOW;
    const app = createTestApp({ db, now: () => at, notifyAccountDeleted });

    for (let i = 0; i < 3; i += 1) expect((await deleteAccount(app, a.headers)).status).toBe(200);
    const limited = await deleteAccount(app, a.headers);

    expect(limited.status).toBe(429);
    expect(failureEnvelopeSchema.parse(await limited.json()).error.code).toBe("RATE_LIMIT");
    expect(notifyAccountDeleted).toHaveBeenCalledTimes(3);
    expect((await deleteAccount(app, b.headers)).status).toBe(200);
    at = NOW + 60 * 60 * 1000;
    expect((await deleteAccount(app, a.headers)).status).toBe(200);
  });

  it("still answers 200, and logs without naming the user, when the owner's email fails", async () => {
    const { logger, lines } = captureLogger();
    const notifyAccountDeleted = vi.fn<NotifyAccountDeleted>().mockRejectedValue(new Error("Resend answered 500"));

    const res = await deleteAccount(createTestApp({ db, logger, notifyAccountDeleted }), await withEmail(a, A_EMAIL));

    expect(res.status).toBe(200);
    await vi.waitFor(() => { expect(lines.join("\n")).toContain("owner email failed"); });
    for (const secret of [a.id, A_EMAIL]) expect(lines.join("\n")).not.toContain(secret);
  });
});
