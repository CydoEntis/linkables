import type { SavedLink } from "@linkables/shared/links";
import { ExternalLink, Ellipsis, NotebookPen, Pin, Plus, Share, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddToPopover } from "../collections/AddToPopover";
import { displayTitle } from "../links/link-display";
import { useLinksUi } from "../links/links-ui-store";
import { copyLink } from "../links/share-link";
import { usePinLink } from "../links/use-pin-link";
import { OpenOriginal } from "../reader/OpenOriginal";
import { TextSizeControl, TextSizeMenuGroup } from "../reader/TextSizeControl";
import type { TextSize } from "../reader/text-size";
import { Confetti } from "../save/Confetti";
import { canSend, sendLink } from "../sharing/send-link";
import { hasNote, NoteDot, NotePopover, NoteSheet } from "./NoteEditor";

export type LinkActionsProps = {
  link: SavedLink;
  // Null when there is no article on the page, so nothing to size.
  textSize: { value: TextSize; onChange: (size: TextSize) => void } | null;
  onDelete: () => void;
  // Set when the note is already on the page: Note goes to it instead of opening an editor.
  onNoteInline: (() => void) | null;
};

// A plain text button on the bar: the shared Button without its surface.
export const QUIET = "bg-transparent inset-shadow-none text-muted-foreground hover:bg-muted hover:text-foreground";
const ACTION = cn(QUIET, "relative h-[38px] gap-2 px-2.5 text-[13.5px] font-semibold");
// Labels show once the bar has room for them; until then they still name the icon.
const LABEL = "max-xl:sr-only";

export function WideActions({ link, textSize, onDelete, onNoteInline }: LinkActionsProps) {
  const noteLabel = <NoteLabel link={link} className={LABEL} />;
  return (
    <div role="group" aria-label="Link actions" className="flex shrink-0 items-center gap-1">
      <PinButton link={link} />
      <AddToButton link={link} />
      <Button variant="ghost" onClick={() => void shareLink(link, false)} className={ACTION}>
        <Share aria-hidden strokeWidth={2} className="size-4" />
        <span className={LABEL}>Share</span>
      </Button>
      {onNoteInline ? (
        <Button variant="ghost" onClick={onNoteInline} className={ACTION}>{noteLabel}</Button>
      ) : (
        <NotePopover link={link} className={buttonVariants({ variant: "ghost", className: cn(ACTION, "data-popup-open:bg-muted") })}>
          {noteLabel}
        </NotePopover>
      )}
      <Button variant="ghost" title="Delete" onClick={onDelete} className={cn(ACTION, "hover:bg-destructive-solid hover:text-white")}>
        <Trash2 aria-hidden strokeWidth={2} className="size-4" />
        <span className="sr-only">Delete</span>
      </Button>
      {textSize ? <TextSizeControl value={textSize.value} onChange={textSize.onChange} /> : null}
      <OpenOriginal url={link.originalUrl} variant="ghost" className="ml-1 h-[38px] gap-2 px-3 text-[13.5px] font-semibold">
        <ExternalLink aria-hidden strokeWidth={2.2} className="size-3.5" />
        <span className="max-lg:sr-only">Open original</span>
      </OpenOriginal>
    </div>
  );
}

const PHONE_ICON = cn(QUIET, "size-11 px-0");

// Phones keep Share and Open original on the bar; the rest waits under More,
// so the bar never runs out of room at 360 px.
export function PhoneActions({ link, textSize, onDelete, onNoteInline }: LinkActionsProps) {
  const pin = usePinLink(link);
  const [noteOpen, setNoteOpen] = useState(false);
  return (
    <div role="group" aria-label="Link actions" className="flex shrink-0 items-center">
      <Button variant="ghost" aria-label="Share" onClick={() => void shareLink(link, true)} className={PHONE_ICON}>
        <Share aria-hidden strokeWidth={2} className="size-[18px]" />
      </Button>
      <OpenOriginal url={link.originalUrl} variant="ghost" className={PHONE_ICON}>
        <ExternalLink aria-hidden strokeWidth={2.2} className="size-[17px]" />
        <span className="sr-only">Open original</span>
      </OpenOriginal>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="More actions" className={buttonVariants({ variant: "ghost", className: cn(PHONE_ICON, "data-popup-open:bg-muted") })}>
          <Ellipsis aria-hidden strokeWidth={2.2} className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 max-w-[calc(100vw-24px)]">
          <DropdownMenuItem onClick={pin.toggle}>
            <Pin aria-hidden className={cn("text-muted-foreground", pin.pinned && "fill-current text-foreground")} />
            {pin.pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { useLinksUi.getState().setAddToLinkId(link.id); }}>
            <Plus aria-hidden className="text-muted-foreground" />
            Add to…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onNoteInline ?? (() => { setNoteOpen(true); })}>
            <NoteLabel link={link} />
          </DropdownMenuItem>
          {textSize ? (
            <>
              <DropdownMenuSeparator />
              <TextSizeMenuGroup value={textSize.value} onChange={textSize.onChange} />
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <NoteSheet link={link} open={noteOpen} onOpenChange={setNoteOpen} />
    </div>
  );
}

function NoteLabel({ link, className }: { link: SavedLink; className?: string }) {
  const noted = hasNote(link);
  return (
    <>
      <span className="relative flex">
        <NotebookPen aria-hidden strokeWidth={2} className="size-4 text-current" />
        {noted ? <NoteDot /> : null}
      </span>
      <span className={className}>
        Note
        {noted ? <span className="sr-only"> (has a note)</span> : null}
      </span>
    </>
  );
}

function PinButton({ link }: { link: SavedLink }) {
  const pin = usePinLink(link);
  const [bursts, setBursts] = useState(0);
  function toggle() {
    if (!pin.pinned) setBursts((count) => count + 1);
    pin.toggle();
  }
  return (
    // The name stays Pin and aria-pressed says whether it is; only the visible word changes.
    <Button
      variant="ghost"
      aria-label="Pin"
      aria-pressed={pin.pinned}
      onClick={toggle}
      className={cn(ACTION, pin.pinned && "bg-foreground text-background hover:bg-foreground hover:text-background")}
    >
      {pin.pinned && bursts > 0 ? <Confetti key={bursts} spread={30} /> : null}
      <Pin key={String(pin.pinned)} aria-hidden strokeWidth={2} className={cn("size-4", pin.pinned && "animate-pin-pop fill-current")} />
      <span className={LABEL}>{pin.pinned ? "Pinned" : "Pin"}</span>
    </Button>
  );
}

function AddToButton({ link }: { link: SavedLink }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <AddToPopover
      link={link}
      open={open}
      onOpenChange={setOpen}
      triggerRef={triggerRef}
      returnFocus
      className={buttonVariants({ variant: "ghost", className: cn(ACTION, "data-popup-open:bg-muted") })}
    >
      <Plus aria-hidden strokeWidth={2.2} className="size-4" />
      <span className={LABEL}>Add to</span>
    </AddToPopover>
  );
}

// Phones hand the link to the system share sheet; elsewhere sharing is copying its address.
function shareLink(link: SavedLink, phone: boolean): Promise<unknown> {
  return phone && canSend() ? sendLink(link.originalUrl, displayTitle(link).text) : copyLink(link.originalUrl);
}
