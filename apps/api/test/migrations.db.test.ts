import { readFileSync } from "node:fs";
import postgres from "postgres";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, inject, it } from "vitest";

// Each test replays migrations from empty, so it runs in a scratch database
// next to the shared test one. The database is kept between runs and reset by
// schema: DROP DATABASE waits for a checkpoint, which can outlast a hook timeout.
const testUrl = new URL(inject("testDatabaseUrl"));
const scratchName = `${testUrl.pathname.slice(1).replace(/_test$/, "")}_migrations_test`;
if (scratchName === testUrl.pathname.slice(1)) {
  throw new Error("The migration scratch database would be the test database itself; rename TEST_DATABASE_URL.");
}
const scratchUrl = new URL(testUrl);
scratchUrl.pathname = `/${scratchName}`;

const admin = postgres(testUrl.href, { onnotice: () => undefined });
let scratch: postgres.Sql;

function statements(file: string): string[] {
  const text = readFileSync(new URL(`../drizzle/${file}`, import.meta.url), "utf8");
  return text.split("--> statement-breakpoint");
}

async function apply(file: string) {
  await scratch.begin(async (tx) => {
    for (const statement of statements(file)) await tx.unsafe(statement);
  });
}

async function ensureScratchDatabase() {
  const [existing] = await admin`select 1 from pg_database where datname = ${scratchName}`;
  if (existing === undefined) await admin.unsafe(`create database "${scratchName}"`);
}

async function insertCollection(userId: string, name: string) {
  await scratch`insert into collection (user_id, name) values (${userId}, ${name})`;
}

const userA = "00000000-0000-4000-8000-00000000000a";
const userB = "00000000-0000-4000-8000-00000000000b";

beforeAll(ensureScratchDatabase);
beforeEach(async () => {
  scratch = postgres(scratchUrl.href, { onnotice: () => undefined });
  await scratch.unsafe("drop schema public cascade; create schema public");
});
afterEach(() => scratch.end());
afterAll(() => admin.end());

describe("collection name migration", () => {
  it("applies on a database that has the old constraint and keeps its rows", async () => {
    await apply("0000_init.sql");
    await insertCollection(userA, "Rust");
    await insertCollection(userB, "rust");

    await apply("0001_collection_name_ignores_case.sql");

    const rows = await scratch<{ name: string }[]>`select name from collection order by user_id`;
    expect(rows.map((row) => row.name)).toEqual(["Rust", "rust"]);
    await expect(insertCollection(userA, "RUST")).rejects.toMatchObject({
      code: "23505",
      constraint_name: "collection_user_id_lower_name_unique",
    });
  });

  it("fails without changes when a user already has names that differ only in case", async () => {
    await apply("0000_init.sql");
    await insertCollection(userA, "Rust");
    await insertCollection(userA, "rust");

    await expect(apply("0001_collection_name_ignores_case.sql")).rejects.toMatchObject({ code: "23505" });

    const [constraint] = await scratch`
      select 1 from pg_constraint where conname = 'collection_user_id_name_unique'`;
    expect(constraint).toBeDefined();
  });
});

describe("collection pin and last use migration", () => {
  it("backfills last use from creation and filing time from save time", async () => {
    await apply("0000_init.sql");
    await apply("0001_collection_name_ignores_case.sql");
    await scratch`
      with r as (insert into resource (canonical_url) values ('https://example.com/') returning id),
        l as (insert into saved_link (user_id, resource_id, original_url, saved_at)
          select ${userA}, id, 'https://example.com/', '2026-01-02T00:00:00Z' from r returning id),
        c as (insert into collection (user_id, name, created_at)
          values (${userA}, 'Rust', '2026-01-01T00:00:00Z') returning id)
      insert into collection_item (collection_id, saved_link_id) select c.id, l.id from c, l`;

    await apply("0002_collection_pin_and_last_use.sql");

    const [col] = await scratch<{ pinned: boolean; last_used_at: Date }[]>`
      select pinned, last_used_at from collection`;
    expect(col).toEqual({ pinned: false, last_used_at: new Date("2026-01-01T00:00:00Z") });
    const [item] = await scratch<{ created_at: Date }[]>`select created_at from collection_item`;
    expect(item?.created_at).toEqual(new Date("2026-01-02T00:00:00Z"));
  });
});

describe("saved from migration", () => {
  it("applies on a database at 0002 and leaves existing links without a source", async () => {
    await apply("0000_init.sql");
    await apply("0001_collection_name_ignores_case.sql");
    await apply("0002_collection_pin_and_last_use.sql");
    await scratch`
      with r as (insert into resource (canonical_url) values ('https://example.com/') returning id)
      insert into saved_link (user_id, resource_id, original_url) select ${userA}, id, 'https://example.com/' from r`;

    await apply("0003_saved_link_saved_from.sql");

    const rows = await scratch<{ original_url: string; saved_from: string | null }[]>`
      select original_url, saved_from from saved_link`;
    expect(rows).toEqual([{ original_url: "https://example.com/", saved_from: null }]);
  });
});

describe("collection share token migration", () => {
  it("leaves existing collections unshared and still accepts the previous image's inserts", async () => {
    for (const file of [
      "0000_init.sql",
      "0001_collection_name_ignores_case.sql",
      "0002_collection_pin_and_last_use.sql",
      "0003_saved_link_saved_from.sql",
      "0004_access_request.sql",
    ]) {
      await apply(file);
    }
    await insertCollection(userA, "Rust");

    await apply("0005_collection_share_token.sql");
    await insertCollection(userB, "Books");

    const rows = await scratch<{ share_token: string | null }[]>`select share_token from collection`;
    expect(rows).toEqual([{ share_token: null }, { share_token: null }]);
  });
});

describe("resource reader migration", () => {
  it("adds an empty reader cache and still accepts the previous image's writes", async () => {
    for (const file of [
      "0000_init.sql",
      "0001_collection_name_ignores_case.sql",
      "0002_collection_pin_and_last_use.sql",
      "0003_saved_link_saved_from.sql",
      "0004_access_request.sql",
      "0005_collection_share_token.sql",
    ]) {
      await apply(file);
    }
    await scratch`insert into resource (canonical_url) values ('https://example.com/old')`;

    await apply("0006_resource_reader.sql");
    const [created] = await scratch<{ id: string }[]>`
      insert into resource (canonical_url) values ('https://example.com/new') returning id`;
    await scratch`insert into resource_reader (resource_id, status, reason) values (${created?.id ?? ""}, 'unavailable', 'no_article')`;
    await scratch`delete from resource where canonical_url = 'https://example.com/new'`;

    expect(await scratch`select 1 from resource_reader`).toHaveLength(0);
    expect(await scratch`select 1 from resource`).toHaveLength(1);
  });
});
