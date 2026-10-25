import type { ListedCollection } from "@linkables/shared/collections";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState, type DragEvent } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { LINK_DRAG_TYPE } from "../links/LinkRow";
import { useLinksUi } from "../links/links-ui-store";
import { findCachedLink } from "../links/use-links";
import { useCollectionsUi } from "./collections-ui-store";
import { displayName } from "./display-name";
import { MiniCover } from "./MiniCover";
import { NewCollectionForm } from "./NewCollectionForm";
import { RECENT_COUNT, sidebarList } from "./sidebar-list";
import { useCollections } from "./use-collections";
import { useMembership } from "./use-membership";

export function SidebarCollections({ activeId }: { activeId: string | undefined }) {
  const collections = useCollections();
  const dragging = useLinksUi((state) => state.draggingId !== null);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState("");
  const all = collections.data ?? [];
  const shown = sidebarList(all, { showAll, query, activeId });

  return (
    <section aria-labelledby="sidebar-collections" className="flex min-h-0 flex-1 flex-col gap-0.5">
      <div className="flex items-center justify-between pr-1 pb-2 pl-3">
        <h2
          id="sidebar-collections"
          className={cn("text-xs font-semibold tracking-[0.02em] uppercase", dragging ? "text-primary" : "text-subtle-foreground")}
        >
          {dragging ? "Drop on a collection" : "Collections"}
        </h2>
        <button
          type="button"
          aria-label="New collection"
          aria-expanded={creating}
          onClick={() => { setCreating(true); }}
          className="flex size-7 items-center justify-center rounded-[7px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus aria-hidden strokeWidth={2.2} className="size-4" />
        </button>
      </div>
      {creating ? (
        <NewCollectionForm
          variant="sidebar"
          onCancel={() => { setCreating(false); }}
          onCreated={(created) => {
            setCreating(false);
            toast("Collection created");
            void navigate({ to: "/c/$collectionId", params: { collectionId: created.id } });
          }}
        />
      ) : null}
      {showAll ? (
        <input
          autoFocus
          value={query}
          onChange={(event) => { setQuery(event.target.value); }}
          placeholder="Find a collection"
          aria-label="Find a collection"
          className="mx-1 mb-1.5 h-[34px] shrink-0 animate-fade-in rounded-[9px] bg-transparent px-3 text-[13px] shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
        />
      ) : null}
      {/* The gutter gives a row room to grow while a link is held over it or lands on it. */}
      <div className="-mx-3 flex min-h-0 flex-col overflow-x-hidden overflow-y-auto px-3">
        {collections.isError ? (
          <p className="flex items-center justify-between px-3 py-2 text-[12.5px] text-muted-foreground">
            Couldn't load collections.
            <button type="button" onClick={() => void collections.refetch()} className="rounded-md px-2 py-1 font-semibold text-foreground hover:bg-muted">
              Retry
            </button>
          </p>
        ) : null}
        <ul className="flex flex-col">
          {shown.map((collection) => (
            <li key={collection.id}>
              <SidebarCollection collection={collection} active={collection.id === activeId} />
            </li>
          ))}
        </ul>
        {showAll && query.trim() !== "" && shown.length === 0 ? (
          <p className="px-3 py-2 text-[12.5px] text-subtle-foreground">No collection called that.</p>
        ) : null}
        {all.length > RECENT_COUNT ? (
          <button
            type="button"
            aria-expanded={showAll}
            onClick={() => {
              setShowAll(!showAll);
              setQuery("");
            }}
            className="flex h-9 shrink-0 items-center rounded-md px-3 text-left text-[13.5px] text-muted-foreground hover:text-foreground"
          >
            {showAll ? "Show less" : `Show all ${String(all.length)}`}
          </button>
        ) : null}
      </div>
    </section>
  );
}

// Each row is a drop target for a dragged link; Add to… is the keyboard way to file.
function SidebarCollection({ collection, active }: { collection: ListedCollection; active: boolean }) {
  const [over, setOver] = useState(false);
  const bumping = useCollectionsUi((state) => state.bumpId === collection.id);
  const setFiled = useMembership();
  const queryClient = useQueryClient();

  function onDragOver(event: DragEvent<HTMLAnchorElement>) {
    if (!event.dataTransfer.types.includes(LINK_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setOver(true);
  }

  function onDrop(event: DragEvent<HTMLAnchorElement>) {
    event.preventDefault();
    setOver(false);
    useLinksUi.getState().setDraggingId(null);
    const link = findCachedLink(queryClient, event.dataTransfer.getData(LINK_DRAG_TYPE));
    if (link === undefined) return;
    useCollectionsUi.getState().bump(collection.id);
    if (link.collections.some((item) => item.id === collection.id)) return;
    setFiled({ link, collection: { id: collection.id, name: collection.name }, filed: true });
  }

  return (
    <Link
      to="/c/$collectionId"
      params={{ collectionId: collection.id }}
      aria-current={active ? "page" : undefined}
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={onDrop}
      className={cn(
        "flex min-h-10 items-center gap-[11px] rounded-md px-2.5 text-[14.5px] font-medium text-[#dcdcd7] transition-[transform,background-color,box-shadow] duration-200 ease-out-soft hover:bg-muted",
        active && "bg-muted text-foreground",
        over && "translate-x-1 scale-[1.02] bg-primary-soft shadow-[inset_0_0_0_1.5px_var(--primary)]",
        bumping && "animate-spring",
      )}
    >
      <MiniCover name={collection.name} cover={collection.cover} className="size-6 rounded-[7px]" />
      <span className="min-w-0 flex-1 truncate">{displayName(collection.name)}</span>
      <span className="text-xs text-subtle-foreground">{collection.linkCount > 0 ? collection.linkCount : ""}</span>
    </Link>
  );
}
