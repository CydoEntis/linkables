import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useWideScreen } from "../shell/use-wide-screen";

type DeleteGroupConfirmProps = {
  name: string;
  open: boolean;
  pending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

// A dialog on a wide screen, a bottom sheet on a phone; the same confirm in both.
export function DeleteGroupConfirm({ name, open, pending, onOpenChange, onConfirm }: DeleteGroupConfirmProps) {
  const wide = useWideScreen();
  const buttons = (
    <div className="flex justify-end gap-2">
      <Button variant="ghost" size="touch" onClick={() => { onOpenChange(false); }}>
        Cancel
      </Button>
      <Button variant="destructive" size="touch" aria-disabled={pending || undefined} onClick={onConfirm}>
        Delete group
      </Button>
    </div>
  );
  if (wide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[420px]">
          <DialogTitle>{`Delete “${name}”?`}</DialogTitle>
          <DialogDescription>Its links stay in the collection.</DialogDescription>
          {buttons}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-3.5 rounded-t-3xl px-5 pt-5 pb-[max(28px,env(safe-area-inset-bottom))]">
        <SheetTitle className="text-[19px] font-bold">{`Delete “${name}”?`}</SheetTitle>
        <SheetDescription className="text-sm text-muted-foreground">Its links stay in the collection.</SheetDescription>
        {buttons}
      </SheetContent>
    </Sheet>
  );
}
