import type { SavedLink } from "@linkables/shared/links";
import { toast } from "sonner";
import { useLinks } from "../links/use-links";

// The page shows the links a screenful at a time, but Open all and Select all mean the whole collection.
export function useAllCollectionLinks(collectionId: string) {
  const { query } = useLinks({ collectionId });

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

  return { ready: query.data !== undefined, loadAll };
}
