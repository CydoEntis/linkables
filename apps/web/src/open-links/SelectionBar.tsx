import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useSelection } from "./selection-store";

type SelectionBarProps = { onOpen: () => void; onSelectAll: () => void; loading: boolean };

// An open dialog, sheet or popover takes Escape for itself first.
const OVERLAY = "[data-slot=dialog-content],[data-slot=sheet-content],[data-slot=popover-content]";

export function SelectionBar({ onOpen, onSelectAll, loading }: SelectionBarProps) {
  const chosen = useSelection((state) => state.chosen);
  const cancel = useSelection((state) => state.cancel);
  const urls = Object.values(chosen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented && document.querySelector(OVERLAY) === null) cancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); };
  }, [cancel]);

  return (
    <div
      role="toolbar"
      aria-label="Selected links"
      className="fixed inset-x-0 bottom-0 z-50 flex animate-fade-up flex-wrap items-center gap-x-3 gap-y-2 border-t border-line-strong bg-popover px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-float md:inset-x-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:rounded-2xl md:border md:py-3 md:pr-3 md:pl-5"
    >
      <p role="status" className="mr-auto text-[15px] font-bold max-md:flex-1">{`${String(urls.length)} selected`}</p>
      <Button variant="ghost" size="touch" aria-disabled={loading || undefined} aria-busy={loading} onClick={onSelectAll} className={loading ? "opacity-60" : undefined}>
        Select all
      </Button>
      <Button variant="ghost" size="touch" onClick={cancel}>
        Cancel
      </Button>
      <Button size="touch" disabled={urls.length === 0} onClick={onOpen} className="font-bold max-md:w-full">
        {`Open ${String(urls.length)}`}
      </Button>
    </div>
  );
}
