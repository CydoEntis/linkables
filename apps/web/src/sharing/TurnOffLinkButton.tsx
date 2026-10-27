import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TURN_OFF_HINT, useTwoTap } from "./use-two-tap";

type TurnOffLinkButtonProps = { onConfirm: () => void; pending?: boolean };

export function TurnOffLinkButton({ onConfirm, pending = false }: TurnOffLinkButtonProps) {
  const { armed, press } = useTwoTap(onConfirm, pending);

  return (
    <div className="flex flex-col items-end">
      {/* aria-disabled, not disabled, so focus stays on the button while it works. */}
      <Button
        variant="ghost"
        aria-disabled={pending || undefined}
        onClick={press}
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
        {armed ? TURN_OFF_HINT : ""}
      </p>
    </div>
  );
}
