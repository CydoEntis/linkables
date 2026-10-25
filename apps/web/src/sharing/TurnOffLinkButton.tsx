import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

type TurnOffLinkButtonProps = { onConfirm: () => void; pending?: boolean };

export const DISARM_AFTER_MS = 3500;

// The one place that asks twice instead of offering Undo: a link turned off can't come back.
export function TurnOffLinkButton({ onConfirm, pending = false }: TurnOffLinkButtonProps) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => { setArmed(false); }, DISARM_AFTER_MS);
    return () => { clearTimeout(timer); };
  }, [armed]);

  function press() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onConfirm();
  }

  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={press}
      className={cn("h-9 gap-2 px-3 text-[13px] font-bold", armed && "bg-destructive/16 text-destructive hover:bg-destructive/22")}
    >
      {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
      <span aria-live="polite">{armed ? "Tap again to turn off" : "Turn off link"}</span>
    </Button>
  );
}
