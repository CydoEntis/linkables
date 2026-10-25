import type { SavedLink } from "@linkables/shared/links";
import { Pin, Share, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Confetti } from "../save/Confetti";
import { copyLink } from "../links/share-link";
import { usePinLink } from "../links/use-pin-link";

const ACTION = "relative h-[42px] gap-[7px] text-[13.5px] max-md:h-11";

export function DetailsActions({ link, onDelete }: { link: SavedLink; onDelete: () => void }) {
  const pin = usePinLink(link);
  const [bursts, setBursts] = useState(0);

  function togglePin() {
    if (!pin.pinned) setBursts((count) => count + 1);
    pin.toggle();
  }

  return (
    <div className="grid grid-cols-3 gap-1.5">
      <Button
        variant="ghost"
        aria-pressed={pin.pinned}
        onClick={togglePin}
        className={cn(ACTION, pin.pinned && "bg-foreground text-background hover:bg-foreground")}
      >
        {pin.pinned && bursts > 0 ? <Confetti key={bursts} spread={30} /> : null}
        <Pin key={String(pin.pinned)} aria-hidden strokeWidth={2.2} className={cn("size-[15px]", pin.pinned && "animate-pin-pop fill-current")} />
        {pin.pinned ? "Pinned" : "Pin"}
      </Button>
      <Button variant="ghost" onClick={() => void copyLink(link.originalUrl)} className={ACTION}>
        <Share aria-hidden strokeWidth={2.2} className="size-[15px]" />
        Share
      </Button>
      <Button
        variant="ghost"
        onClick={onDelete}
        className={cn(ACTION, "text-muted-foreground hover:bg-destructive-solid hover:text-white")}
      >
        <Trash2 aria-hidden strokeWidth={2} className="size-[15px]" />
        Delete
      </Button>
    </div>
  );
}
