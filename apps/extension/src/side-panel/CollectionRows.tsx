import type { ListedCollection } from "@linkables/shared/collections";
import { Globe } from "lucide-react";
import { displayName } from "../collections/picker";
import { useCollections } from "../collections/use-collections";
import { GHOST_BUTTON } from "../ui";
import { collectionRows, linkCount } from "./link-list";
import { Empty, ListProblem, RowsSkeleton } from "./LinkRows";
import { appUrl, useShareTokens } from "./queries";
import { Mosaic } from "./Thumb";

type CollectionRowsProps = { query: string; onShare: (collection: ListedCollection) => void };

export function CollectionRows({ query, onShare }: CollectionRowsProps) {
  const collections = useCollections();
  const shared = useShareTokens().data;
  if (collections.isPending) return <RowsSkeleton />;
  if (collections.isError) return <ListProblem onRetry={() => void collections.refetch()}>Couldn't load your collections.</ListProblem>;
  const rows = collectionRows(collections.data, query);
  if (rows.length === 0) return <Empty>{query.trim() ? `No collections match “${query.trim()}”.` : "No collections yet."}</Empty>;

  return (
    <ul aria-label="Collections" className="-mx-1.5 flex flex-col">
      {rows.map((collection) => (
        <li key={collection.id} className="flex items-center gap-2 rounded-xl px-1.5 py-1.5 hover:bg-muted">
          <a href={appUrl(`/c/${collection.id}`)} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg">
            <Mosaic name={collection.name} cover={collection.cover} />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-semibold">{displayName(collection.name)}</span>
              <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                {linkCount(collection.linkCount)}
                {shared?.has(collection.id) ? (
                  <span className="flex items-center gap-1 text-soft-foreground">
                    <Globe aria-hidden className="size-3" />
                    Shared
                  </span>
                ) : null}
              </span>
            </span>
          </a>
          <button
            type="button"
            aria-label={`Share ${displayName(collection.name)}`}
            onClick={() => { onShare(collection); }}
            className={GHOST_BUTTON}
          >
            Share
          </button>
        </li>
      ))}
    </ul>
  );
}
