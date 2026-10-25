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
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onConfirm();
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        variant="ghost"
        disabled={pending}
        onClick={onClick}
        className={cn(
          "h-9 px-3 text-[13.5px] font-bold inset-shadow-none",
          armed ? "bg-destructive/16 text-destructive hover:bg-destructive/22" : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
        {armed ? "Tap again to turn off" : "Turn off link"}
      </Button>
      <p aria-live="polite" className="text-right text-[12.5px] leading-normal text-muted-foreground empty:hidden">
        {armed ? "The link stops working right away. Turning it on later makes a new one." : ""}
      </p>
    </div>
  );
}
