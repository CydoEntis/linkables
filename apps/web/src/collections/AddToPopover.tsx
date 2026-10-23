import type { SavedLink } from "@linkables/shared/links";
import { useRef } from "react";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { CollectionPicker } from "./CollectionPicker";

type AddToPopoverProps = {
  link: SavedLink;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

export function AddToPopover({ link, open, onOpenChange, className }: AddToPopoverProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger className={className}>Add to…</PopoverTrigger>
      <PopoverContent initialFocus={inputRef} className="w-[280px]">
        <PopoverTitle className="sr-only">Add to a collection</PopoverTitle>
        <CollectionPicker link={link} variant="popover" inputRef={inputRef} />
      </PopoverContent>
    </Popover>
  );
}
