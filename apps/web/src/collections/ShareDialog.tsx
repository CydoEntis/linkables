import type { ListedCollection } from "@linkables/shared/collections";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { displayName } from "./display-name";
import { MiniCover } from "./MiniCover";

type ShareDialogProps = { collection: ListedCollection; open: boolean; onOpenChange: (open: boolean) => void };

export function linkCountLabel(count: number): string {
  return `${String(count)} ${count === 1 ? "link" : "links"}`;
}

// A placeholder until sharing ships: it shows what is coming and offers no link that would not work.
export function ShareDialog({ collection, open, onOpenChange }: ShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex items-center gap-3.5">
          <MiniCover name={collection.name} cover={collection.cover} className="size-14 rounded-[14px]" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="text-xl wrap-anywhere">Share “{displayName(collection.name)}”</DialogTitle>
            <DialogDescription className="text-[13px]">{linkCountLabel(collection.linkCount)} · anyone with the link will be able to view</DialogDescription>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Sharing arrives in a later version.</p>
      </DialogContent>
    </Dialog>
  );
}
