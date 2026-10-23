import { useNavigate, useRouter, useSearch } from "@tanstack/react-router";
import { z } from "zod";

// ?link=<id> opens a link's details on any list, so details can be linked to
// and the browser's Back closes them. A malformed id is dropped, not an error page.
export const linkDetailsSearchShape = { link: z.uuid().optional().catch(undefined) };

export const linkDetailsSearchSchema = z.object(linkDetailsSearchShape);

// Whether the open details have a history entry of their own to go back from,
// rather than arriving with the page (a reload or a pasted address).
let pushedByApp = false;

export function useLinkDetails() {
  const linkId = useSearch({ strict: false, select: (search) => search.link });
  const navigate = useNavigate();
  const router = useRouter();

  // Swapping one open link for another replaces the entry, so Back still closes the panel.
  function open(id: string) {
    const replace = linkId !== undefined;
    if (!replace) pushedByApp = true;
    void navigate({ to: ".", search: (prev) => ({ ...prev, link: id }), replace });
  }

  function close() {
    if (linkId === undefined) return;
    if (pushedByApp) {
      pushedByApp = false;
      router.history.back();
      return;
    }
    void navigate({ to: ".", search: (prev) => ({ ...prev, link: undefined }), replace: true });
  }

  return { linkId, open, close };
}
