import { useRef } from "react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { displayTitle, domainOf } from "../links/link-display";
import { LinkThumb } from "../links/LinkThumb";
import { useLinksUi } from "../links/links-ui-store";
import { CollectionPicker } from "./CollectionPicker";

// The phone's Add to sheet, opened from a row's swipe actions.
export function AddToSheet() {
  const link = useLinksUi((state) => state.addToLink);
  const setLink = useLinksUi((state) => state.setAddToLink);
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Sheet open={link !== null} onOpenChange={(open) => { if (!open) setLink(null); }}>
      <SheetContent
        initialFocus={false}
        className="max-h-[86%] gap-3.5 rounded-t-3xl px-[18px] pt-2.5 pb-[calc(34px+env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--line-strong)]"
      >
        <span aria-hidden className="h-1 w-9 shrink-0 self-center rounded-sm bg-[#333]" />
        {link ? (
          <>
            <div className="flex shrink-0 items-center gap-3">
              <LinkThumb link={link} />
              <span className="flex min-w-0 flex-1 flex-col">
                <SheetTitle className="truncate font-bold">{displayTitle(link).text}</SheetTitle>
                <span className="text-[12.5px] text-muted-foreground">{domainOf(link.originalUrl)}</span>
              </span>
            </div>
            <SheetDescription className="shrink-0 text-[13px] font-semibold">Add to a collection</SheetDescription>
            <CollectionPicker key={link.id} link={link} variant="sheet" inputRef={inputRef} />
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
