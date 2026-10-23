import { z } from "zod";
import { linkDetailsSearchShape } from "../link-details/details-search";
import { listFiltersShape, orderRange } from "../search/list-filters";

// The URL's views. "inbox" keeps the API's name; the UI calls it To sort (CONTEXT.md).
export const LINKS_VIEWS = ["all", "pinned", "inbox"] as const;

export type LinksView = (typeof LINKS_VIEWS)[number];

export const VIEW_LABELS: Record<LinksView, string> = {
  all: "All links",
  pinned: "Pinned",
  inbox: "To sort",
};

export const DEFAULT_LINKS_SEARCH = { view: "all" } as const;

// A hand-edited or stale ?view= falls back to All links instead of an error page.
export const linksSearchSchema = z
  .object({
    view: z.enum(LINKS_VIEWS).default(DEFAULT_LINKS_SEARCH.view).catch(DEFAULT_LINKS_SEARCH.view),
    ...listFiltersShape,
    collection: z.uuid().optional().catch(undefined),
    ...linkDetailsSearchShape,
  })
  .transform(orderRange);
