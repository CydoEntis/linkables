import { or, sql } from "drizzle-orm";
import { resource, savedLink } from "../db/schema";

function containsPattern(q: string): string {
  return "%" + q.replace(/[\\%_]/g, "\\$&") + "%";
}

// Quote tokens before binding MATCH: punctuation and operator-like user input
// cannot become FTS syntax. The outer query still enforces link ownership.
export function matchesSearch(q: string) {
  const words = q.match(/[\p{L}\p{N}]+/gu) ?? [];
  const query = words.map((word) => '"' + word + '"').join(" AND ");
  const pattern = containsPattern(q);
  return or(
    query === "" ? sql`false` : sql`${savedLink.id} in (select link_id from saved_link_search where saved_link_search match ${query})`,
    sql`${resource.canonicalUrl} like ${pattern} escape '\\'`,
    sql`${savedLink.originalUrl} like ${pattern} escape '\\'`,
  );
}
