import type { LinkSort } from "@linkaroo/shared/links";
import { and, asc, desc, eq, sql, type SQL } from "drizzle-orm";
import type { Db } from "../db/client";
import { resource, savedLink } from "../db/schema";
import { ValidationError } from "../http/errors";
import type { Cursor } from "./cursor";

export const cursorSavedAt = sql<string>`to_char(${savedLink.savedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

// ORDER BY, the cursor row's key lookup and the page comparison all use this
// expression in the database's default collation, so a page boundary never skips
// or repeats a row.
const titleKey = sql<string>`lower(coalesce(${savedLink.titleOverride}, ${resource.title}, ${resource.canonicalUrl}))`;

export function orderBy(sort: LinkSort): SQL[] {
  switch (sort) {
    case "newest":
      return [desc(savedLink.savedAt), desc(savedLink.id)];
    case "oldest":
      return [asc(savedLink.savedAt), asc(savedLink.id)];
    case "title":
      return [asc(titleKey), asc(savedLink.id)];
  }
}

// A deleted link has no position to resume from, and another user's id must not
// reveal where their link sorts, so both are rejected the same way.
async function titleKeyOf(db: Db, userId: string, linkId: string): Promise<string> {
  const [row] = await db
    .select({ titleKey })
    .from(savedLink)
    .innerJoin(resource, eq(resource.id, savedLink.resourceId))
    .where(and(eq(savedLink.id, linkId), eq(savedLink.userId, userId)));
  if (row === undefined) {
    throw new ValidationError("Cursor is no longer valid", { fieldErrors: { cursor: "Cursor is no longer valid" } });
  }
  return row.titleKey;
}

export async function after(db: Db, userId: string, cursor: Cursor): Promise<SQL> {
  switch (cursor.sort) {
    case "newest":
      return sql`(${savedLink.savedAt}, ${savedLink.id}) < (${cursor.savedAt}::timestamptz, ${cursor.id}::uuid)`;
    case "oldest":
      return sql`(${savedLink.savedAt}, ${savedLink.id}) > (${cursor.savedAt}::timestamptz, ${cursor.id}::uuid)`;
    case "title": {
      const key = await titleKeyOf(db, userId, cursor.id);
      return sql`(${titleKey}, ${savedLink.id}) > (${key}::text, ${cursor.id}::uuid)`;
    }
  }
}

export function cursorAt(sort: LinkSort, row: { id: string; cursorSavedAt: string }): Cursor {
  return sort === "title" ? { sort, id: row.id } : { sort, savedAt: row.cursorSavedAt, id: row.id };
}
