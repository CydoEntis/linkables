import type { SavedLink } from "@linkables/shared/links";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useLinksUi } from "../links/links-ui-store";
import { belongsIn, linksKeys, useLinks, type LinksPages } from "../links/use-links";

// The ids, as one comma-joined string so it compares by value, of links this collection has lost:
// deleted (inside their Undo window) or filed out, in any list the cache holds. Ticks made in a
// filtered or searched view are not in the unfiltered list, so they are judged by what happened to them.
function goneIds(queryClient: QueryClient, collectionId: string, deletingIds: readonly string[]): string {
  const gone = new Set(deletingIds);
  for (const [, data] of queryClient.getQueriesData<LinksPages>({ queryKey: linksKeys.lists })) {
    for (const link of data?.pages.flatMap((page) => page.items) ?? []) {
      if (!belongsIn({ collectionId }, link)) gone.add(link.id);
    }
  }
  return [...gone].sort().join(",");
}

// The page shows the links a screenful at a time, but Open all and Select all mean the whole collection.
export function useAllCollectionLinks(collectionId: string) {
  const { query } = useLinks({ collectionId });
  const queryClient = useQueryClient();
  const deletingIds = useLinksUi((state) => state.deletingIds);
  const gone = useSyncExternalStore(
    (onChange) => queryClient.getQueryCache().subscribe(onChange),
    () => goneIds(queryClient, collectionId, deletingIds),
  );

  async function loadAll(): Promise<SavedLink[] | null> {
    let { data, hasNextPage } = query;
    while (hasNextPage) {
      const result = await query.fetchNextPage();
      if (result.isError) {
        toast.error("Couldn't load all the links. Try again.");
        return null;
      }
      ({ data, hasNextPage } = result);
    }
    return data?.pages.flatMap((page) => page.items) ?? [];
  }

  return { ready: query.data !== undefined, gone, loadAll };
}
