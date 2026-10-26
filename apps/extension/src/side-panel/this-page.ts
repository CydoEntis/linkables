import { SEARCH_QUERY_MAX_LENGTH, type SavedLink } from "@linkables/shared/links";
import { canonicalize } from "@linkables/shared/url";

// The API has no lookup by address. Search matches any link whose address contains
// the query, so searching for the canonical address and keeping the exact match
// finds the page's link, the same one a save would report as a duplicate.
export function lookupQuery(url: string): string | null {
  const result = canonicalize(url);
  if (!result.ok || result.url.length > SEARCH_QUERY_MAX_LENGTH) return null;
  return result.url;
}

export function savedMatch(url: string, links: readonly SavedLink[]): SavedLink | null {
  const result = canonicalize(url);
  if (!result.ok) return null;
  return links.find((link) => link.resource.canonicalUrl === result.url) ?? null;
}
