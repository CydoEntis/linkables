import type { SavedLink } from "@linkables/shared/links";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NoteField } from "./NoteField";

export function hasNote(link: SavedLink): boolean {
  return Boolean(link.note?.trim());
}

// A lime dot on the Note button says a note is there without opening it.
export function NoteDot() {
  return <span aria-hidden className="absolute -top-0.5 -right-1 size-[7px] rounded-full bg-primary ring-2 ring-background" />;
}

type NotePopoverProps = { link: SavedLink; className: string; children: ReactNode };

// Closing the popover unmounts the field, which saves anything still unsaved.
export function NotePopover({ link, className, children }: NotePopoverProps) {
  return (
    <Popover>
      <PopoverTrigger className={className}>{children}</PopoverTrigger>
      <PopoverContent className="w-[360px] p-3">
        <PopoverTitle className="sr-only">Note</PopoverTitle>
        <NoteField link={link} />
      </PopoverContent>
    </Popover>
  );
}

type NoteSheetProps = { link: SavedLink; open: boolean; onOpenChange: (open: boolean) => void };

export function NoteSheet({ link, open, onOpenChange }: NoteSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-3 rounded-t-3xl px-[18px] pt-2.5 pb-[calc(24px+env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--line-strong)]">
        <span aria-hidden className="h-1 w-9 shrink-0 self-center rounded-sm bg-[#333]" />
        <SheetTitle className="sr-only">Note</SheetTitle>
        <NoteField link={link} />
        <Button size="touch" onClick={() => { onOpenChange(false); }} className="font-bold">
          Done
        </Button>
      </SheetContent>
    </Sheet>
  );
}
