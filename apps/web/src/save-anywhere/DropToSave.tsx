import { toast } from "sonner";
import { cn } from "cn";
import { useSaveLink } from "../links/use-save-link";
import { useDropToSave } from "./use-drop-to-save";

// Full-panel "Drop to save" over the list while a link is dragged onto the window.
export function DropToSave({ className }: { className?: string }) {
  const save = useSaveLink();
  const dragging = useDropToSave((url) => {
    if (url) save(url);
    else toast.error("There was no link in what you dropped.");
  });
  if (!dragging) return null;
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-3.5 z-50 flex animate-fade-in flex-col items-center justify-center gap-1.5 rounded-[18px] border-2 border-dashed border-primary bg-primary/8 p-6 text-center [animation-duration:150ms]",
        className,
      )}
    >
      <p className="text-[32px] font-bold">Drop to save</p>
      <p className="text-sm text-muted-foreground">It lands at the top of All links.</p>
    </div>
  );
}
