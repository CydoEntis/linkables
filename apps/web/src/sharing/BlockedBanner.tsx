import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { linkCountLabel } from "../collections/ShareDialog";

type BlockedBannerProps = { wide: boolean; opened: number; blocked: number; total: number; onOpenRest: () => void };

// Phones open one tab per tap, so there's nothing to retry there: the
// visitor taps the rest, and each one gets its tick.
export function BlockedBanner({ wide, opened, blocked, total, onOpenRest }: BlockedBannerProps) {
  return (
    <div
      role="status"
      className="mb-[22px] flex animate-fade-up flex-wrap items-center gap-x-5 gap-y-[18px] rounded-2xl border border-line-strong bg-card p-4 md:py-[18px] md:pr-[18px] md:pl-5"
    >
      <div className="flex min-w-0 flex-[1_1_340px] items-start gap-3.5">
        <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-primary/14 text-primary">
          <ShieldAlert className="size-[18px]" />
        </span>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-base font-bold">
            {wide ? `Your browser blocked ${String(blocked)} of the ${String(total)} links` : `Your browser opened ${linkCountLabel(opened)}`}
          </p>
          <p className="text-[14px] leading-normal text-soft-foreground">
            {wide
              ? "That's normal the first time. Click the blocked pop-up icon at the end of the address bar, choose Always allow pop-ups from linkables.app, then open the rest."
              : "Phones open one link at a time. Tap the others below; the ones you've opened get a tick."}
          </p>
        </div>
      </div>
      {wide ? (
        <>
          <AddressBar />
          <Button onClick={onOpenRest} className="h-[46px] px-[18px] text-[15px]">
            Open the other {blocked}
          </Button>
        </>
      ) : null}
    </div>
  );
}

// A little address bar with the blocked pop-up icon pulsing at its end.
function AddressBar() {
  return (
    <div
      aria-hidden
      className="flex h-[46px] flex-[0_1_300px] items-center gap-2 rounded-full border border-line-strong bg-sidebar py-0 pr-1.5 pl-4 font-mono text-xs text-muted-foreground"
    >
      <span className="flex-1 truncate">{`${window.location.host}${window.location.pathname}`}</span>
      <span className="flex size-[34px] shrink-0 animate-ping-lime items-center justify-center rounded-full bg-accent text-foreground">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-[15px]">
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="M2 8h20" />
          <path d="m9 12 6 5" />
          <path d="m15 12-6 5" />
        </svg>
      </span>
    </div>
  );
}
