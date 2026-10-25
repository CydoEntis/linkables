import type { SavedLink } from "@linkables/shared/links";
import { Link } from "@tanstack/react-router";
import { BookOpen, Pin, Share, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { Confetti } from "../save/Confetti";
import { copyLink } from "../links/share-link";
import { usePinLink } from "../links/use-pin-link";

const ACTION = "relative h-[58px] flex-col gap-[5px] px-1 text-[12.5px]";
const ICON = "size-[17px]";

export function DetailsActions({ link, onDelete }: { link: SavedLink; onDelete: () => void }) {
  const pin = usePinLink(link);
  const [bursts, setBursts] = useState(0);
  const readable = hasReaderView(link);

  function togglePin() {
    if (!pin.pinned) setBursts((count) => count + 1);
    pin.toggle();
  }

  return (
    <div role="group" aria-label="Actions" className={cn("grid gap-1.5", readable ? "grid-cols-4" : "grid-cols-3")}>
      {readable ? (
        <Link to="/l/$linkId/read" params={{ linkId: link.id }} className={buttonVariants({ variant: "ghost", className: ACTION })}>
          <BookOpen aria-hidden strokeWidth={2} className={ICON} />
          Read
        </Link>
      ) : null}
      <Button
        variant="ghost"
        aria-pressed={pin.pinned}
        onClick={togglePin}
        className={cn(ACTION, pin.pinned && "bg-foreground text-background hover:bg-foreground")}
      >
        {pin.pinned && bursts > 0 ? <Confetti key={bursts} spread={30} /> : null}
        <Pin key={String(pin.pinned)} aria-hidden strokeWidth={2} className={cn(ICON, pin.pinned && "animate-pin-pop fill-current")} />
        {pin.pinned ? "Pinned" : "Pin"}
      </Button>
      <Button variant="ghost" onClick={() => void copyLink(link.originalUrl)} className={ACTION}>
        <Share aria-hidden strokeWidth={2} className={ICON} />
        Share
      </Button>
      <Button variant="ghost" onClick={onDelete} className={cn(ACTION, "hover:bg-destructive-solid hover:text-white")}>
        <Trash2 aria-hidden strokeWidth={2} className={cn(ICON, "text-muted-foreground group-hover/button:text-white")} />
        Delete
      </Button>
    </div>
  );
}

// Videos and files have no article, so they get no Read action; the reader
// still explains itself for a page that turns out to have none.
function hasReaderView(link: SavedLink): boolean {
  return link.resource.kind !== "video" && link.resource.kind !== "other";
}
