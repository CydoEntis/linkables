import { or, sql } from "drizzle-orm";
import { resource, savedLink } from "../db/schema";

// The english parser reads a whole hostname as one token, so the host's dots
// become spaces to let "docs github" match docs.github.com.
const hostWords = sql`translate(coalesce(substring(${resource.canonicalUrl} from '^[a-z]+://([^/:?#]+)'), ''), '.', ' ')`;

const searchableText = sql`coalesce(${savedLink.titleOverride}, ${resource.title}, '') || ' ' || coalesce(${resource.description}, '') || ' ' || ${hostWords}`;

function containsPattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, "\\$&")}%`;
}

// websearch_to_tsquery never raises on user syntax (quotes, -, :, &, unbalanced
// parens), unlike to_tsquery. The URL match catches what full text cannot, such
// as "github.com" or a path fragment.
export function matchesSearch(q: string) {
  const pattern = containsPattern(q);
  return or(
    sql`to_tsvector('english', ${searchableText}) @@ websearch_to_tsquery('english', ${q})`,
    sql`${resource.canonicalUrl} ilike ${pattern} escape '\\'`,
    sql`${savedLink.originalUrl} ilike ${pattern} escape '\\'`,
  );
}
