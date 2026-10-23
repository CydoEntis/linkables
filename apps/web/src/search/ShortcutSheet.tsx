import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { modKeyLabel } from "./shortcut-keys";

type ShortcutSheetProps = { open: boolean; onOpenChange: (open: boolean) => void };

function shortcuts(mod: string): [keys: string, does: string][] {
  return [
    ["/", "Search your links"],
    ["Esc", "Clear the search, then leave the field"],
    [`${mod}K`, "Open the command palette"],
    [`${mod}V`, "Save a copied link (outside a field)"],
    ["?", "Show these shortcuts"],
  ];
}

// "?" lists the keyboard shortcuts (brief 5.9).
export function ShortcutSheet({ open, onOpenChange }: ShortcutSheetProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <dl className="flex flex-col">
          {shortcuts(modKeyLabel()).map(([keys, does]) => (
            <div key={keys} className="flex min-h-11 items-center justify-between gap-4 border-b border-border last:border-0">
              <dt className="order-last">
                <kbd className="rounded-md px-2 py-[3px] font-mono text-xs font-medium text-soft-foreground shadow-[inset_0_0_0_1px_var(--line-strong)]">{keys}</kbd>
              </dt>
              <dd className="text-sm">{does}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
