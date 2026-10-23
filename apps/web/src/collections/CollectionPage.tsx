import type { ListedCollection } from "@linkables/shared/collections";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LinksScreen } from "../links/LinksScreen";
import type { FiltersChange } from "../search/list-filters";
import { AppShell } from "../shell/AppShell";
import { CollectionTitle } from "./CollectionTitle";
import { useCollectionsUi, type PendingDelete } from "./collections-ui-store";
import { displayName } from "./display-name";
import { MiniCover } from "./MiniCover";
import { linkCountLabel, ShareDialog } from "./ShareDialog";
import { useCollections } from "./use-collections";
import { useDeleteCollection } from "./use-delete-collection";

const route = getRouteApi("/c/$collectionId");

export function CollectionPage() {
  const { collectionId } = route.useParams();
  const filters = route.useSearch();
  const navigate = route.useNavigate();
  const onFiltersChange: FiltersChange = (patch, { replace = false } = {}) => {
    void navigate({ search: (previous) => ({ ...previous, ...patch }), replace });
  };
  const collections = useCollections();
  const collection = collections.data?.find((item) => item.id === collectionId);
  const pendingDelete = useCollectionsUi((state) => state.deleting[collectionId]);

  if (pendingDelete) return <CollectionDeleted collectionId={collectionId} pending={pendingDelete} />;
  if (collections.isSuccess && collection === undefined) return <CollectionGone collectionId={collectionId} />;
  return (
    <LinksScreen
      scope={{ collectionId }}
      filters={filters}
      onFiltersChange={onFiltersChange}
      heading={collection ? <CollectionHeader collection={collection} /> : <div aria-hidden className="h-[60px] md:mt-[30px] md:mb-3.5 md:h-[52px]" />}
    />
  );
}

function CollectionHeader({ collection }: { collection: ListedCollection }) {
  const [sharing, setSharing] = useState(false);
  const deleteCollection = useDeleteCollection();

  return (
    <div className="mt-2 mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-2 md:mt-[30px] md:mb-3.5 md:px-0">
      <div className="flex min-w-0 items-center gap-3.5">
        <MiniCover name={collection.name} cover={collection.cover} className="hidden size-11 animate-pop rounded-lg md:grid" />
        <div className="flex min-w-0 flex-col">
          <CollectionTitle collection={collection} />
          <span className="mt-1 text-[13.5px] text-muted-foreground">{linkCountLabel(collection.linkCount)}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="touch" onClick={() => { setSharing(true); }} className="h-11 rounded-md px-4 font-semibold md:h-10">
          Share
        </Button>
        <button
          type="button"
          aria-label="Delete collection"
          title="Delete collection"
          onClick={() => { deleteCollection(collection); }}
          className="flex size-11 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive md:size-10"
        >
          <Trash2 aria-hidden strokeWidth={2} className="size-[15px]" />
        </button>
      </div>
      <ShareDialog collection={collection} open={sharing} onOpenChange={setSharing} />
    </div>
  );
}

function CollectionDeleted({ collectionId, pending }: { collectionId: string; pending: PendingDelete }) {
  return (
    <AppShell scope={{ collectionId }}>
      <div className="flex flex-col items-start gap-3 px-3 py-14 md:px-3.5">
        <h1 className="text-[17px] font-bold md:text-xl">Deleted</h1>
        <p className="text-sm text-muted-foreground md:text-[14.5px]">
          {displayName(pending.name)} is deleted. Its links are still saved.
        </p>
        <Button variant="ghost" size="touch" onClick={pending.undo}>
          Undo
        </Button>
      </div>
    </AppShell>
  );
}

function CollectionGone({ collectionId }: { collectionId: string }) {
  return (
    <AppShell scope={{ collectionId }}>
      <div className="flex flex-col items-start gap-3 px-3 py-14 md:px-3.5">
        <h1 className="text-[17px] font-bold md:text-xl">This collection is gone</h1>
        <p className="text-sm text-muted-foreground md:text-[14.5px]">It may have been deleted. Its links are still saved.</p>
        <Link to="/" className="font-semibold text-primary underline-offset-4 hover:underline">
          Go to All links
        </Link>
      </div>
    </AppShell>
  );
}
