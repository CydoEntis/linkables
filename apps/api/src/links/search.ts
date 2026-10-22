import { or, sql } from "drizzle-orm";
import { resource, savedLink } from "../db/schema";

const searchableText = sql`coalesce(${savedLink.titleOverride}, ${resource.title}, '') || ' ' || coalesce(${resource.description}, '')`;

function containsPattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}

// websearch_to_tsquery never raises on user syntax (quotes, -, :, &, unbalanced
// parens), unlike to_tsquery. The host is part of the URL, so the URL match
// also covers the domain.
export function matchesSearch(q: string) {
  const pattern = containsPattern(q);
  return or(
    sql`to_tsvector('english', ${searchableText}) @@ websearch_to_tsquery('english', ${q})`,
    sql`${resource.canonicalUrl} ilike ${pattern} escape '\\'`,
    sql`${savedLink.originalUrl} ilike ${pattern} escape '\\'`,
  );
}
