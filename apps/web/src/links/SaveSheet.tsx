import { Check, Plus } from "lucide-react";
import { useId, useRef } from "react";
import { cn } from "cn";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useLinksUi } from "./links-ui-store";
import { useSaveLinkForm } from "./use-save-link-form";

export function SaveFab() {
  const setOpen = useLinksUi((state) => state.setSaveSheetOpen);
  return (
    <button
      type="button"
      aria-label="Save a link"
      onClick={() => { setOpen(true); }}
      className="fixed right-5 bottom-[calc(28px+env(safe-area-inset-bottom))] z-40 flex size-[60px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab md:hidden"
    >
      <Plus aria-hidden strokeWidth={2.6} className="size-[26px]" />
    </button>
  );
}

export function SaveSheet() {
  const open = useLinksUi((state) => state.saveSheetOpen);
  const setOpen = useLinksUi((state) => state.setSaveSheetOpen);
  const { register, onSubmit, canSave, error } = useSaveLinkForm({
    onSubmitted: () => { setOpen(false); },
    onInvalid: () => { setOpen(true); },
  });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { ref: registerRef, ...field } = register("url");
  const errorId = useId();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        initialFocus={inputRef}
        className="max-h-[86%] gap-3.5 rounded-t-3xl px-[18px] pt-2.5 pb-[calc(34px+env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--line-strong)]"
      >
        <span aria-hidden className="h-1 w-9 self-center rounded-sm bg-[#333]" />
        <SheetTitle className="text-xl font-bold">Save a link</SheetTitle>
        <form noValidate onSubmit={onSubmit} className="flex gap-2">
          <input
            {...field}
            ref={(element) => {
              registerRef(element);
              inputRef.current = element;
            }}
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="Paste or type a link"
            aria-label="Link"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-[54px] min-w-0 flex-1 rounded-2xl bg-muted px-4 text-base outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:shadow-[0_0_0_1.5px_var(--destructive)] aria-invalid:focus-visible:outline-destructive"
          />
          <button
            type="submit"
            aria-label="Save"
            className={cn(
              "flex size-[54px] shrink-0 items-center justify-center rounded-2xl transition-colors duration-200",
              canSave ? "bg-primary text-primary-foreground" : "bg-muted text-subtle-foreground",
            )}
          >
            <Check aria-hidden strokeWidth={2.6} className="size-[22px]" />
          </button>
        </form>
        {error ? (
          <p id={errorId} role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        ) : null}
        <SheetDescription className="text-[13px] leading-normal">
          Faster: in any app, tap Share, then linkables.
        </SheetDescription>
      </SheetContent>
    </Sheet>
  );
}
