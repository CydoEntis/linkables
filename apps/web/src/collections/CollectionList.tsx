import type { ListedCollection } from "@linkables/shared/collections";
import { useEffect } from "react";
import { LinkList,LinkListSkeleton } from "../links/LinkList";
import type { FiltersChange, ListFilters } from "../search/list-filters";
import { useCollectionsUi } from "./collections-ui-store";
import { GroupSections } from "./GroupSections";
import { NewGroupForm } from "./NewGroupForm";
import { useGroups } from "./use-groups";

type CollectionListProps = { collection: ListedCollection; filters: ListFilters; onFiltersChange: FiltersChange };

// A collection with no groups is the plain list; with groups it is one section per group.
export function CollectionList({ collection, filters, onFiltersChange }: CollectionListProps) {
  const groups = useGroups(collection.id);
  const creating = useCollectionsUi((state) => state.creatingGroupIn === collection.id);
  const groupList = groups.data ?? [];
  const grouped = groupList.length > 0;
  const setGroupedCollectionId = useCollectionsUi((state) => state.setGroupedCollectionId);
  useEffect(() => {
    setGroupedCollectionId(grouped ? collection.id : null);
    return () => { setGroupedCollectionId(null); };
  }, [grouped, collection.id, setGroupedCollectionId]);

  return (
    <>
      {creating ? <NewGroupForm collectionId={collection.id} groupCount={groupList.length} /> : null}
      {groups.isPending ? (
        <LinkListSkeleton />
      ) : grouped ? (
        <GroupSections
          collectionId={collection.id}
          linkCount={collection.linkCount}
          groups={groupList}
          filters={filters}
          onFiltersChange={onFiltersChange}
        />
      ) : (
        <LinkList scope={{ collectionId: collection.id }} filters={filters} onFiltersChange={onFiltersChange} />
      )}
    </>
  );
}
