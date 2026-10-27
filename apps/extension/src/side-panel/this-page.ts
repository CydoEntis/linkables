import { SEARCH_QUERY_MAX_LENGTH, type ListLinksResponse, type SavedLink } from "@linkables/shared/links";
import { canonicalize } from "@linkables/shared/url";

// unknown: the lookup could not finish, so nothing may be concluded (or cleared) from it.
export type PageLookup = { status: "saved"; link: SavedLink } | { status: "not-saved" } | { status: "unknown" };

// Enough for a site with hundreds of saved pages; past it the panel offers Save,
// and saving reports the existing link as a duplicate.
const MAX_PAGES = 5;

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

// Results come newest first, so the page's own link can sit behind newer links
// whose address contains it (every github.com/... link matches github.com/).
export async function findPageLink(url: string, fetchPage: (cursor: string | undefined) => Promise<ListLinksResponse>): Promise<PageLookup> {
  if (lookupQuery(url) === null) return { status: "unknown" };
  let cursor: string | undefined;
  for (let read = 0; read < MAX_PAGES; read += 1) {
    const page = await fetchPage(cursor);
    const link = savedMatch(url, page.items);
    if (link) return { status: "saved", link };
    if (page.cursor === null) return { status: "not-saved" };
    cursor = page.cursor;
  }
  return { status: "unknown" };
}
