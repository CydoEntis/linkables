import type { LinkSort } from "@linkaroo/shared/links";
import { asc, desc, sql, type SQL } from "drizzle-orm";
import { resource, savedLink } from "../db/schema";
import type { Cursor } from "./cursor";

const cursorSavedAt = sql<string>`to_char(${savedLink.savedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

// ORDER BY and the cursor comparison both use this expression, in the database's
// default collation, so a page boundary never skips or repeats a row. The cursor
// stores the key as Postgres computed it rather than recomputing it in JS.
const titleKey = sql<string>`lower(coalesce(${savedLink.titleOverride}, ${resource.title}, ${resource.canonicalUrl}))`;

export const sortKeys = { cursorSavedAt, titleKey };

export type SortKeys = { id: string; cursorSavedAt: string; titleKey: string };

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

export function after(cursor: Cursor): SQL {
  switch (cursor.sort) {
    case "newest":
      return sql`(${savedLink.savedAt}, ${savedLink.id}) < (${cursor.savedAt}::timestamptz, ${cursor.id}::uuid)`;
    case "oldest":
      return sql`(${savedLink.savedAt}, ${savedLink.id}) > (${cursor.savedAt}::timestamptz, ${cursor.id}::uuid)`;
    case "title":
      return sql`(${titleKey}, ${savedLink.id}) > (${cursor.title}::text, ${cursor.id}::uuid)`;
  }
}

export function cursorAt(sort: LinkSort, row: SortKeys): Cursor {
  return sort === "title"
    ? { sort, title: row.titleKey, id: row.id }
    : { sort, savedAt: row.cursorSavedAt, id: row.id };
}
