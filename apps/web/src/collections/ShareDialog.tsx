import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import type { ListedCollection } from "@linkables/shared/collections";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useWideScreen } from "../link-details/use-wide-screen";
import { ShareOff } from "../sharing/ShareOff";
import { ShareOn } from "../sharing/ShareOn";
import { useSetSharing, useShareState } from "../sharing/use-share";
import { displayName } from "./display-name";
import { linkCountLabel } from "./link-count";
import { MiniCover } from "./MiniCover";

type ShareDialogProps = { collection: ListedCollection; open: boolean; onOpenChange: (open: boolean) => void };

// The handoff's pop-in: up 8 px from .98 over 240 ms.
const POP_IN =
  "gap-[18px] p-[22px] duration-240 ease-out-soft transition-[opacity,scale,translate] data-ending-style:translate-y-[calc(-50%+8px)] data-ending-style:scale-98 data-starting-style:translate-y-[calc(-50%+8px)] data-starting-style:scale-98";

function sharingLabel(token: string | null | undefined): string {
  if (token === undefined) return "";
  return token === null ? " · only you can see it" : " · anyone with the link can view";
}

// A dialog on wide screens, a bottom sheet on phones.
export function ShareDialog({ collection, open, onOpenChange }: ShareDialogProps) {
  const wide = useWideScreen();
  const content = <ShareContent collection={collection} open={open} wide={wide} />;

  if (wide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={POP_IN}>{content}</DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-h-[92svh] gap-[18px] overflow-y-auto rounded-t-[26px] px-5 pt-2.5 pb-[calc(40px+env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--line-strong)] duration-320">
        <span aria-hidden className="h-[5px] w-[38px] shrink-0 self-center rounded-[3px] bg-line-strong" />
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute top-[26px] right-4 flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X aria-hidden className="size-[18px]" />
        </DialogPrimitive.Close>
        {content}
      </SheetContent>
    </Sheet>
  );
}

function ShareContent({ collection, open, wide }: { collection: ListedCollection; open: boolean; wide: boolean }) {
  const state = useShareState(collection.id, open);
  const token = state.data?.token;

  return (
    <>
      <div className="flex items-center gap-3.5 pr-10">
        <MiniCover name={collection.name} cover={collection.cover} className="size-[52px] rounded-xl" />
        <div className="flex min-w-0 flex-col gap-[3px]">
          <DialogTitle className="pr-0 text-[19px] tracking-[-0.01em] wrap-anywhere">Share “{displayName(collection.name)}”</DialogTitle>
          <DialogDescription className="text-[13px]">
            {linkCountLabel(collection.linkCount)}
            {sharingLabel(token)}
          </DialogDescription>
        </div>
      </div>
      {state.isPending ? <p className="flex h-[50px] items-center text-sm text-muted-foreground">Checking the link…</p> : null}
      {state.isError ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">Couldn't load the link.</p>
          <Button variant="ghost" size="touch" onClick={() => void state.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      {state.isSuccess ? <ShareLink collection={collection} token={state.data.token} wide={wide} /> : null}
    </>
  );
}

function ShareLink({ collection, token, wide }: { collection: ListedCollection; token: string | null; wide: boolean }) {
  const setSharing = useSetSharing(collection.id);

  function turnOn() {
    setSharing.mutate(true, { onError: () => { toast.error("Couldn't make the link. Try again."); } });
  }

  function turnOff() {
    setSharing.mutate(false, {
      onSuccess: () => { toast("Link turned off. It no longer works."); },
      onError: () => { toast.error("Couldn't turn the link off. Try again."); },
    });
  }

  if (token === null) return <ShareOff collection={collection} pending={setSharing.isPending} onTurnOn={turnOn} />;
  return <ShareOn token={token} title={displayName(collection.name)} wide={wide} turningOff={setSharing.isPending} onTurnOff={turnOff} />;
}
