import type { SavedLink } from "@linkables/shared/links";
import { useRef } from "react";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { CollectionPicker } from "./CollectionPicker";

type AddToPopoverProps = {
  link: SavedLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where focus goes on close, given the trigger.
  finalFocus: (trigger: HTMLElement) => HTMLElement | null;
  className?: string;
};

export function AddToPopover({ link, open, onOpenChange, finalFocus, className }: AddToPopoverProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger ref={triggerRef} className={className}>
        Add to…
      </PopoverTrigger>
      <PopoverContent
        initialFocus={inputRef}
        finalFocus={() => (triggerRef.current ? finalFocus(triggerRef.current) : true)}
        className="w-[280px]"
      >
        <PopoverTitle className="sr-only">Add to a collection</PopoverTitle>
        <CollectionPicker link={link} variant="popover" inputRef={inputRef} />
      </PopoverContent>
    </Popover>
  );
}
