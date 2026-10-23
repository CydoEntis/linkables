import type { SavedLink } from "@linkables/shared/links";
import { useRef, type RefObject } from "react";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { CollectionPicker } from "./CollectionPicker";

type AddToPopoverProps = {
  link: SavedLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
  // False when the caller moves focus itself on close.
  returnFocus: boolean;
  className?: string;
};

export function AddToPopover({ link, open, onOpenChange, triggerRef, returnFocus, className }: AddToPopoverProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger ref={triggerRef} className={className}>
        Add to…
      </PopoverTrigger>
      <PopoverContent initialFocus={inputRef} finalFocus={returnFocus} className="w-[280px]">
        <PopoverTitle className="sr-only">Add to a collection</PopoverTitle>
        <CollectionPicker link={link} variant="popover" inputRef={inputRef} />
      </PopoverContent>
    </Popover>
  );
}
