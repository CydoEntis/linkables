import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "cn";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { displayName } from "./display-name";
import { MiniCover } from "./MiniCover";
import { matchingCollections } from "./picker";
import { useCollections } from "./use-collections";

type CollectionChipProps = { activeId: string | undefined; allActive: boolean };

const ROW = "flex min-h-[52px] items-center gap-3 rounded-xl px-2.5 text-left text-base";

// The phone's "All links ▾" chip: picks what the list shows, a collection or everything.
export function CollectionChip({ activeId, allActive }: CollectionChipProps) {
  const collections = useCollections();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const popupRef = useRef<HTMLDivElement | null>(null);
  const active = collections.data?.find((collection) => collection.id === activeId);
  const on = allActive || activeId !== undefined;
  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <button type="button" aria-haspopup="dialog" onClick={() => { setOpen(true); }} className="flex h-11 shrink-0 items-center rounded-full">
        <span
          className={cn(
            "flex h-[38px] max-w-[170px] items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold",
            on ? "bg-foreground text-background" : "bg-muted text-soft-foreground",
          )}
        >
          <span className="truncate">{active ? displayName(active.name) : "All links"}</span>
          <ChevronDown aria-hidden strokeWidth={2.6} className="size-3.5 shrink-0" />
        </span>
      </button>
      <Sheet open={open} onOpenChange={(next) => { if (!next) close(); }}>
        <SheetContent
          ref={popupRef}
          initialFocus={popupRef}
          className="max-h-[86%] gap-3.5 rounded-t-3xl px-[18px] pt-2.5 pb-[calc(34px+env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--line-strong)]"
        >
          <span aria-hidden className="h-1 w-9 shrink-0 self-center rounded-sm bg-[#333]" />
          <SheetTitle className="text-xl font-bold">Show</SheetTitle>
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); }}
            placeholder="Find a collection"
            aria-label="Find a collection"
            className="h-[46px] shrink-0 rounded-xl bg-background px-3.5 text-base shadow-[inset_0_0_0_1px_var(--line-strong)] outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring"
          />
          <nav aria-label="Collections" className="-mx-1.5 flex min-h-0 flex-col overflow-auto">
            <Link to="/" onClick={close} aria-current={allActive ? "page" : undefined} className={cn(ROW, "font-semibold", allActive && "bg-[#232323]")}>
              All links
            </Link>
            {matchingCollections(collections.data ?? [], query).map((collection) => (
              <Link
                key={collection.id}
                to="/c/$collectionId"
                params={{ collectionId: collection.id }}
                onClick={close}
                aria-current={collection.id === activeId ? "page" : undefined}
                className={cn(ROW, collection.id === activeId && "bg-[#232323]")}
              >
                <MiniCover name={collection.name} cover={collection.cover} className="size-[30px] rounded-[8px]" />
                <span className="min-w-0 flex-1 truncate">{displayName(collection.name)}</span>
                <span className="text-[13px] text-subtle-foreground">{collection.linkCount > 0 ? collection.linkCount : ""}</span>
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
