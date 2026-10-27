import type { SaveLinkResponse } from "@linkables/shared/links";
import { cn } from "cn";
import { Check, LibraryBig, Link2, Pin } from "lucide-react";
import { CollectionPicker } from "../collections/CollectionPicker";
import { FiledGroups } from "../collections/FiledGroups";
import { locationLabel } from "../collections/picker";
import { useFiling } from "../collections/use-collections";
import { useCopy, type CopyState } from "../copy/use-copy";
import { openSidePanelOrApp } from "../side-panel/open-side-panel";
import { useWindowId } from "../side-panel/use-window-id";
import { Alert, TILE } from "../ui";
import { savedTitle } from "./save-flow";
import { usePin } from "./use-pin";

type SavedProps = { link: SaveLinkResponse; pageTitle: string | null };

const SHARE_LABELS: Record<CopyState, string> = { idle: "Share link", copied: "Copied ✓", failed: "Couldn't copy" };

export function Saved({ link, pageTitle }: SavedProps) {
  const filing = useFiling(link.id, link.collections);
  const pin = usePin(link.id, link.pinned);
  const share = useCopy();
  const windowId = useWindowId();
  const location = locationLabel(filing.filed.map((collection) => collection.name));
  const problem = pin.problem ?? filing.problem;

  return (
    <>
      <header className="flex items-center gap-3 p-4">
        <span
          className={cn(
            "flex size-10 flex-none items-center justify-center rounded-full bg-primary text-primary-foreground",
            !link.duplicate && "animate-saved",
          )}
        >
          <Check aria-hidden strokeWidth={3} className="size-[19px] animate-check-draw [stroke-dasharray:24]" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="text-[16.5px] font-bold">{link.duplicate ? "Already saved" : "Saved"}</h1>
          <p className="truncate text-[12px] text-muted-foreground">{savedTitle(link, pageTitle)}</p>
        </div>
        <span title={location} className="flex h-[26px] max-w-[120px] flex-none items-center rounded-full bg-muted px-2.5 text-[11.5px] font-semibold text-soft-foreground">
          <span className="truncate">{location}</span>
        </span>
      </header>
      <div className="grid animate-rise grid-cols-3 gap-1.5 px-3 pb-3">
        <button
          type="button"
          aria-pressed={pin.pinned}
          onClick={pin.toggle}
          className={cn(TILE, pin.pinned ? "bg-foreground text-background" : "bg-muted hover:bg-accent")}
        >
          <Pin aria-hidden strokeWidth={2.2} className={cn("size-[15px]", pin.pinned && "animate-pin-pop fill-current")} />
          {pin.pinned ? "Pinned" : "Pin"}
        </button>
        <button type="button" onClick={() => void share.copy(link.originalUrl)} className={cn(TILE, "bg-muted hover:bg-accent")}>
          <Link2 aria-hidden strokeWidth={2} className="size-[15px]" />
          {SHARE_LABELS[share.state]}
        </button>
        <button type="button" onClick={() => { openAllLinks(windowId); }} className={cn(TILE, "bg-muted hover:bg-accent")}>
          <LibraryBig aria-hidden strokeWidth={2} className="size-[15px]" />
          All links
        </button>
      </div>
      <p role="status" className="sr-only">
        {share.state === "copied" ? "Link copied" : null}
      </p>
      <FiledGroups linkId={link.id} filed={filing.filed} initial={link.collections} />
      <CollectionPicker filedIds={new Set(filing.filed.map((collection) => collection.id))} onFile={filing.setFiledIn} />
      {problem ? <div className="px-4 pb-3"><Alert>{problem}</Alert></div> : null}
    </>
  );
}

function openAllLinks(windowId: number | undefined) {
  void openSidePanelOrApp(windowId).then(() => { window.close(); });
}
