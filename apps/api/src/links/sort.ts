import { createHash } from "node:crypto";
import type { LinkSort } from "@linkables/shared/links";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client";
import { resource, savedLink } from "../db/schema";
import { ValidationError } from "../http/errors";
import type { Cursor } from "./cursor";

const cursorSavedAt = sql<string>`to_char(${savedLink.savedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

// ORDER BY, the cursor row's key lookup and the page comparison all use this
// expression in the database's default collation, so a page boundary never skips
// or repeats a row.
const titleKey = sql<string>`lower(coalesce(${savedLink.titleOverride}, ${resource.title}, ${resource.canonicalUrl}))`;

export function orderBy(sort: LinkSort): SQL[] {
  switch (sort) {
    case "newest":
      return [desc(savedLink.pinned), desc(savedLink.savedAt), desc(savedLink.id)];
    case "oldest":
      return [desc(savedLink.pinned), asc(savedLink.savedAt), asc(savedLink.id)];
    case "title":
      return [desc(savedLink.pinned), asc(titleKey), asc(savedLink.id)];
  }
}

export const sortKeys = { cursorSavedAt, titleKey };

export type SortKeys = { id: string; pinned: boolean; cursorSavedAt: string; titleKey: string };

function fingerprint(key: string): string {
  return createHash("sha256").update(key, "utf8").digest().subarray(0, 12).toString("base64url");
}

// A deleted link has no position to resume from, a renamed one would resume from
// its new place and skip or repeat rows, and another user's id must not reveal
// where their link sorts, so all three are rejected the same way. A pin change
// needs no check: the boundary uses the cursor's own pinned.
async function titleKeyOf(db: Db, userId: string, cursor: { id: string; k: string }): Promise<string> {
  const [row] = await db
    .select({ titleKey })
    .from(savedLink)
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .where(and(eq(savedLink.id, cursor.id), eq(savedLink.userId, userId)));
  if (row === undefined || fingerprint(row.titleKey) !== cursor.k) {
    throw new ValidationError("Cursor is no longer valid", { fieldErrors: { cursor: "Cursor is no longer valid" } });
  }
  return row.titleKey;
}

// pinned sorts desc while oldest and title sort asc, so a single row comparison
// cannot express the boundary: rows after the cursor are the unpinned ones that
// follow a pinned cursor, or the later rows in the cursor's own group.
function afterInGroup(pinned: boolean, laterInGroup: SQL): SQL {
  return sql`(${savedLink.pinned} < ${pinned} or (${savedLink.pinned} = ${pinned} and ${laterInGroup}))`;
}

export async function after(db: Db, userId: string, cursor: Cursor): Promise<SQL> {
  switch (cursor.sort) {
    case "newest":
      return sql`(${savedLink.pinned}, ${savedLink.savedAt}, ${savedLink.id}) < (${cursor.pinned}, ${cursor.savedAt}::timestamptz, ${cursor.id}::uuid)`;
    case "oldest":
      return afterInGroup(
        cursor.pinned,
        sql`(${savedLink.savedAt}, ${savedLink.id}) > (${cursor.savedAt}::timestamptz, ${cursor.id}::uuid)`,
      );
    case "title": {
      const key = await titleKeyOf(db, userId, cursor);
      return afterInGroup(cursor.pinned, sql`(${titleKey}, ${savedLink.id}) > (${key}::text, ${cursor.id}::uuid)`);
    }
  }
}

export function cursorAt(sort: LinkSort, row: SortKeys): Cursor {
  return sort === "title"
    ? { sort, pinned: row.pinned, id: row.id, k: fingerprint(row.titleKey) }
    : { sort, pinned: row.pinned, savedAt: row.cursorSavedAt, id: row.id };
}
