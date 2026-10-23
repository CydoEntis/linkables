import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { z } from "zod";

// ?link=<id> opens a link's details on any list, so details can be linked to
// and the browser's Back closes them. A malformed id is dropped, not an error page.
export const linkDetailsSearchShape = { link: z.uuid().optional().catch(undefined) };

export const linkDetailsSearchSchema = z.object(linkDetailsSearchShape);

// The list's filters without ?link=: the open details must not change which list is loaded.
export function withoutLinkDetails<Search extends { link?: string | undefined }>(search: Search): Omit<Search, "link"> {
  const filters = { ...search };
  delete filters.link;
  return filters;
}

declare module "@tanstack/react-router" {
  interface HistoryState {
    // Set on the entry that opening details pushed, so Back can return to the list's own entry.
    linkDetailsPushed?: boolean;
  }
}

export function useLinkDetails() {
  const linkId = useSearch({ strict: false, select: (search) => search.link });
  const navigate = useNavigate();
  const router = useRouter();

  // Swapping one open link for another replaces the entry, so Back still closes the panel.
  function open(id: string) {
    const replace = linkId !== undefined;
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, link: id }),
      replace,
      state: (prev) => (replace ? prev : { ...prev, linkDetailsPushed: true }),
    });
  }

  // Details that arrived with the page (a pasted address) have no list entry to go back to.
  function close() {
    if (linkId === undefined) return;
    if (router.state.location.state.linkDetailsPushed === true) {
      router.history.back();
      return;
    }
    void navigate({ to: ".", search: (prev) => ({ ...prev, link: undefined }), replace: true });
  }

  return { linkId, open, close };
}
