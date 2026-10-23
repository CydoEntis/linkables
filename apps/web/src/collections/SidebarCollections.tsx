import type { ListedCollection } from "@linkables/shared/collections";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import { displayName } from "./display-name";
import { MiniCover } from "./MiniCover";
import { NewCollectionForm } from "./NewCollectionForm";
import { RECENT_COUNT, sidebarList } from "./sidebar-list";
import { useCollections } from "./use-collections";

export function SidebarCollections({ activeId }: { activeId: string | undefined }) {
  const collections = useCollections();
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
          className="text-xs font-semibold tracking-[0.02em] text-subtle-foreground uppercase"
        >
          Collections
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
      <div className="flex min-h-0 flex-col overflow-auto">
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

function SidebarCollection({ collection, active }: { collection: ListedCollection; active: boolean }) {
  return (
    <Link
      to="/c/$collectionId"
      params={{ collectionId: collection.id }}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-10 items-center gap-[11px] rounded-md px-2.5 text-[14.5px] font-medium text-[#dcdcd7] hover:bg-muted",
        active && "bg-muted text-foreground",
      )}
    >
      <MiniCover name={collection.name} cover={collection.cover} className="size-6 rounded-[7px]" />
      <span className="min-w-0 flex-1 truncate">{displayName(collection.name)}</span>
      <span className="text-xs text-subtle-foreground">{collection.linkCount > 0 ? collection.linkCount : ""}</span>
    </Link>
  );
}
