import type { SavedLink } from "@linkables/shared/links";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { useLinksUi } from "../links/links-ui-store";
import { belongsIn, findListedCopy, useLinks } from "../links/use-links";
import { useSelection } from "./selection-store";

// The page shows the links a screenful at a time, but Open all and Select all mean the whole collection.
export function useAllCollectionLinks(collectionId: string) {
  const { query } = useLinks({ collectionId });
  const queryClient = useQueryClient();
  const deletingIds = useLinksUi((state) => state.deletingIds);

  // A link deleted on this device is unticked at once.
  useEffect(() => { useSelection.getState().drop(new Set(deletingIds)); }, [deletingIds]);

  // Stops paging and stays quiet once the caller says the user has moved on.
  async function loadAll(isCurrent: () => boolean): Promise<SavedLink[] | null> {
    let { data, hasNextPage } = query;
    while (hasNextPage) {
      const result = await query.fetchNextPage();
      if (!isCurrent()) return null;
      if (result.isError) {
        toast.error("Couldn't load all the links. Try again.");
        return null;
      }
      ({ data, hasNextPage } = result);
    }
    return data?.pages.flatMap((page) => page.items) ?? [];
  }

  // The ticked links that are still in this collection, judged by each one's freshest cached copy
  // (a stale copy in another list must not count). A link filed out on another device, with no
  // cached copy to say so, stays ticked: the cache is all this page knows.
  function stillChosen(chosen: Readonly<Record<string, string>>): string[] {
    const gone = new Set<string>();
    for (const id of Object.keys(chosen)) {
      const copy = findListedCopy(queryClient, id);
      if (copy && !belongsIn({ collectionId }, copy.link)) gone.add(id);
    }
    useSelection.getState().drop(gone);
    return Object.entries(chosen).filter(([id]) => !gone.has(id)).map(([, url]) => url);
  }

  return { ready: query.data !== undefined, loadAll, stillChosen };
}
