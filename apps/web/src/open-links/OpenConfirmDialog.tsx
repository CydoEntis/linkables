import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useWideScreen } from "../shell/use-wide-screen";
import { BIG_OPEN_COUNT, isBigOpen, useAskBeforeOpening } from "./confirm-setting";

type OpenConfirmDialogProps = {
  // Null while closed.
  count: number | null;
  onConfirm: (dontAskAgain: boolean) => void;
  onCancel: () => void;
};

// A dialog on a wide screen, a bottom sheet on a phone; the same confirm in both.
export function OpenConfirmDialog({ count, onConfirm, onCancel }: OpenConfirmDialogProps) {
  const wide = useWideScreen();
  const openRef = useRef<HTMLButtonElement>(null);
  const onOpenChange = (open: boolean) => { if (!open) onCancel(); };
  const body = count === null ? null : <Body count={count} openRef={openRef} onConfirm={onConfirm} onCancel={onCancel} />;
  if (wide) {
    return (
      <Dialog open={count !== null} onOpenChange={onOpenChange}>
        <DialogContent initialFocus={openRef}>{body}</DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={count !== null} onOpenChange={onOpenChange}>
      <SheetContent initialFocus={openRef} className="rounded-t-[26px] px-5 pt-[22px] pb-[max(28px,env(safe-area-inset-bottom))] duration-320">
        {body}
      </SheetContent>
    </Sheet>
  );
}

type BodyProps = { count: number; openRef: React.RefObject<HTMLButtonElement | null> } & Pick<OpenConfirmDialogProps, "onConfirm" | "onCancel">;

function Body({ count, openRef, onConfirm, onCancel }: BodyProps) {
  const ask = useAskBeforeOpening((state) => state.ask);
  const [dontAsk, setDontAsk] = useState(false);
  return (
    <>
      <DialogTitle>{`Open ${String(count)} links?`}</DialogTitle>
      <DialogDescription>They'll open in new tabs.</DialogDescription>
      {isBigOpen(count) ? (
        <p className="text-[13.5px] leading-normal text-muted-foreground">
          That's a lot of tabs at once, and your browser may block some of them.
          {ask ? "" : ` This always asks above ${String(BIG_OPEN_COUNT)} links, even with asking turned off.`}
        </p>
      ) : null}
      {ask ? (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
          <input type="checkbox" checked={dontAsk} onChange={(event) => { setDontAsk(event.target.checked); }} className="size-[18px] accent-primary" />
          Don't ask me again
        </label>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="touch" onClick={onCancel}>
          Cancel
        </Button>
        <Button ref={openRef} size="touch" onClick={() => { onConfirm(dontAsk); }}>
          Open
        </Button>
      </div>
    </>
  );
}
