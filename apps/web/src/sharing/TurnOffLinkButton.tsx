import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const ARMED_MS = 3500;

type TurnOffLinkButtonProps = { onConfirm: () => void; pending?: boolean };

// A link that is turned off can't come back, so this asks for a second tap
// instead of offering Undo.
export function TurnOffLinkButton({ onConfirm, pending = false }: TurnOffLinkButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => { setArmed(false); }, ARMED_MS);
    return () => { clearTimeout(timer); };
  }, [armed]);

  function onClick() {
    if (pending) return;
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onConfirm();
  }

  return (
    <div className="flex flex-col items-end">
      {/* aria-disabled, not disabled, so focus stays on the button while it works. */}
      <Button
        variant="ghost"
        aria-disabled={pending || undefined}
        onClick={onClick}
        className={cn(
          "h-9 px-3 text-[13.5px] font-bold inset-shadow-none",
          armed ? "bg-destructive/16 text-destructive hover:bg-destructive/22" : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
        {armed ? "Tap again to turn off" : "Turn off link"}
      </Button>
      {/* Always rendered, so screen readers are listening when the hint appears. */}
      <p aria-live="polite" className={cn("text-right text-[12.5px] leading-normal text-muted-foreground", armed && "mt-1.5")}>
        {armed ? "The link stops working right away. Turning it on later makes a new one." : ""}
      </p>
    </div>
  );
}
