import type { ListedCollection } from "@linkables/shared/collections";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Globe, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withoutOldLink } from "../link-page/old-link-address";
import { useWideScreen } from "../shell/use-wide-screen";
import { LinksScreen } from "../links/LinksScreen";
import type { FiltersChange } from "../search/list-filters";
import { useShareToken } from "../sharing/use-share";
import { AppShell } from "../shell/AppShell";
import { CollectionTitle } from "./CollectionTitle";
import { useCollectionsUi, type PendingDelete } from "./collections-ui-store";
import { displayName } from "./display-name";
import { MiniCover } from "./MiniCover";
import { linkCountLabel } from "./link-count";
import { ShareControls } from "./ShareControls";
import { useCollections } from "./use-collections";
import { useDeleteCollection } from "./use-delete-collection";

const route = getRouteApi("/c/$collectionId");

export function CollectionPage() {
  const { collectionId } = route.useParams();
  const filters = withoutOldLink(route.useSearch());
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
  const deleteCollection = useDeleteCollection();
  const shared = useShareToken(collection.id) !== undefined;
  const wide = useWideScreen();

  return (
    <div className="mt-2 mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 px-2 md:mt-[30px] md:mb-3.5 md:px-0">
      <div className="flex min-w-0 items-center gap-3.5">
        <MiniCover name={collection.name} cover={collection.cover} className="hidden size-11 animate-pop rounded-lg md:grid" />
        <div className="flex min-w-0 flex-col">
          <CollectionTitle collection={collection} />
          <span className="mt-1 flex items-center gap-2 text-[13.5px] text-muted-foreground">
            {linkCountLabel(collection.linkCount)}
            {shared ? (
              <span className="inline-flex h-[22px] animate-fade-in items-center gap-[5px] rounded-full bg-muted px-[9px] text-xs font-semibold text-foreground">
                <Globe aria-hidden className="size-3" />
                Shared
              </span>
            ) : null}
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <ShareControls collection={collection} wide={wide} />
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
