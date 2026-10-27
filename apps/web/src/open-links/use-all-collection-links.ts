import type { SavedLink } from "@linkables/shared/links";
import { toast } from "sonner";
import { useLinksUi } from "../links/links-ui-store";
import { belongsIn, useLinks } from "../links/use-links";

// The page shows the links a screenful at a time, but Open all and Select all mean the whole collection.
export function useAllCollectionLinks(collectionId: string) {
  const scope = { collectionId };
  const { query } = useLinks(scope);
  const deletingIds = useLinksUi((state) => state.deletingIds);
  // What the page still shows: a link filed out of the collection or deleted is gone from it.
  const links = (query.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (link) => belongsIn(scope, link) && !deletingIds.includes(link.id),
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

  return { ready: query.data !== undefined, links, loadAll };
}
