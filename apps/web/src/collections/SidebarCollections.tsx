import type { ListedCollection } from "@linkables/shared/collections";
import type { SavedLink } from "@linkables/shared/links";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, Globe, Plus } from "lucide-react";
import { useState, type DragEvent } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { LINK_DRAG_TYPE } from "../links/LinkRow";
import { useLinksUi } from "../links/links-ui-store";
import { findCachedLink } from "../links/use-links";
import { useSharedIds } from "../sharing/use-share";
import { useCollectionsUi } from "./collections-ui-store";
import { displayName } from "./display-name";
import { MiniCover } from "./MiniCover";
import { NewCollectionForm } from "./NewCollectionForm";
import { useCollections } from "./use-collections";
import { useMembership } from "./use-membership";

export function SidebarCollections({ activeId }: { activeId: string | undefined }) {
  const collections = useCollections();
  const dragging = useLinksUi((state) => state.draggingId !== null);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  // The link dropped on the empty-state box: filed into the collection once it is named.
  const [pendingLink, setPendingLink] = useState<SavedLink | null>(null);
  const setFiled = useMembership();
  const queryClient = useQueryClient();
  const sharedIds = useSharedIds();
  const empty = collections.data?.length === 0;
  const stopCreating = () => { setCreating(false); setPendingLink(null); };

  function onDropToStart(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    useLinksUi.getState().setDraggingId(null);
    const link = findCachedLink(queryClient, event.dataTransfer.getData(LINK_DRAG_TYPE));
    if (link === undefined) return;
    setPendingLink(link);
    setCreating(true);
  }

  return (
    <section aria-labelledby="sidebar-collections" className="flex min-h-0 flex-1 flex-col gap-0.5">
      <div className="flex items-center justify-between pr-1 pb-2 pl-3">
        <h2
          id="sidebar-collections"
          className={cn("text-xs font-semibold tracking-[0.02em] uppercase", dragging && !empty ? "text-primary" : "text-subtle-foreground")}
        >
          {dragging && !empty ? "Drop on a collection" : "Collections"}
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
          onCancel={stopCreating}
          onCreated={(created) => {
            const link = pendingLink;
            stopCreating();
            if (link !== null) {
              setFiled({ link, collection: { id: created.id, name: created.name }, filed: true });
              return;
            }
            toast("Collection created");
            void navigate({ to: "/c/$collectionId", params: { collectionId: created.id } });
          }}
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
          {(collections.data ?? []).map((collection) => (
            <li key={collection.id}>
              <SidebarCollection collection={collection} active={collection.id === activeId} shared={sharedIds.has(collection.id)} />
            </li>
          ))}
        </ul>
        {empty && dragging && !creating ? (
          <StartDropTarget onDrop={onDropToStart} />
        ) : empty && !creating ? (
          <p className="px-3 py-0.5 text-[13px] leading-normal text-subtle-foreground">Collections you make show up here.</p>
        ) : null}
      </div>
    </section>
  );
}

function StartDropTarget({ onDrop }: { onDrop: (event: DragEvent<HTMLElement>) => void }) {
  const [over, setOver] = useState(false);
  return (
    <div
      data-testid="start-drop-target"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(LINK_DRAG_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(event) => { setOver(false); onDrop(event); }}
      className={cn(
        "flex animate-pop flex-col gap-0.5 rounded-md px-3 py-3 outline-1 -outline-offset-1 outline-dashed outline-primary/60 transition-[transform,background-color,outline-color] duration-200 ease-out-soft",
        over ? "scale-[1.02] bg-primary-soft outline-solid outline-primary" : "bg-primary-soft/40",
      )}
    >
      <span className="flex items-center gap-2 text-[14px] font-medium text-primary">
        <Plus aria-hidden strokeWidth={2.2} className="size-4" />
        Drop here to start a collection
      </span>
      <span className="pl-6 text-[12.5px] text-muted-foreground">Name it, and this link goes in.</span>
    </div>
  );
}

// Each row is a drop target for a dragged link; Add to… is the keyboard way to file.
type SidebarCollectionProps = { collection: ListedCollection; active: boolean; shared: boolean };

function SidebarCollection({ collection, active, shared }: SidebarCollectionProps) {
  const [over, setOver] = useState(false);
  const dragging = useLinksUi((state) => state.draggingId !== null);
  const bumping = useCollectionsUi((state) => state.bumpId === collection.id);
  const setFiled = useMembership();
  const queryClient = useQueryClient();

  const draggingId = useLinksUi((state) => state.draggingId);
  const draggedLink = draggingId === null ? undefined : findCachedLink(queryClient, draggingId);
  const alreadyFiled = draggedLink?.collections.some((item) => item.id === collection.id) ?? false;

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
        "flex min-h-10 items-center gap-[11px] rounded-md px-2.5 text-[14.5px] font-medium text-[#dcdcd7] transition-[transform,background-color,box-shadow,outline-color] duration-200 ease-out-soft hover:bg-muted",
        active && "bg-muted text-foreground",
        // Outline, not border: the row keeps its size when a drag starts.
        dragging && !over && "bg-primary-soft/40 outline-1 -outline-offset-1 outline-dashed outline-primary/50",
        over && "translate-x-1 scale-[1.02] bg-primary-soft shadow-[inset_0_0_0_1.5px_var(--primary),0_0_16px_-2px_var(--primary-soft)]",
        bumping && "animate-spring",
      )}
    >
      <MiniCover name={collection.name} cover={collection.cover} className="size-6 rounded-[7px]" />
      <span className="min-w-0 flex-1 truncate">{displayName(collection.name)}</span>
      {shared ? (
        <span title="Shared" className="flex text-muted-foreground">
          <Globe aria-hidden className="size-[13px]" />
          <span className="sr-only">, shared</span>
        </span>
      ) : null}
      {over ? (
        <span data-testid="drop-cue" className="flex items-center gap-1 text-xs font-semibold text-primary">
          {alreadyFiled ? <Check aria-hidden strokeWidth={2.4} className="size-3.5" /> : <Plus aria-hidden strokeWidth={2.4} className="size-3.5" />}
          {alreadyFiled ? "Already in" : "Add"}
        </span>
      ) : (
        <span className="text-xs text-subtle-foreground">{collection.linkCount > 0 ? collection.linkCount : ""}</span>
      )}
    </Link>
  );
}
