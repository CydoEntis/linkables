import { redirect } from "@tanstack/react-router";
import { z } from "zod";

// Links used to open in a panel at ?link=<id> on any list. Those addresses are
// in bookmarks and shared messages, so the list routes still read the id and
// send it on to the link's own page. A malformed id is dropped, not an error page.
export const oldLinkSearchShape = { link: z.uuid().optional().catch(undefined) };

export function redirectOldLinkAddress({ search }: { search: { link?: string | undefined } }) {
  if (search.link !== undefined) redirect({ to: "/l/$linkId", params: { linkId: search.link }, replace: true, throw: true });
}

// The list's filters without the old ?link=, which never changes which list is loaded.
export function withoutOldLink<Search extends { link?: string | undefined }>(search: Search): Omit<Search, "link"> {
  const filters = { ...search };
  delete filters.link;
  return filters;
}
