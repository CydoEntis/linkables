import { ArrowLeft } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { tileFor } from "../links/link-display";
import { useWideScreen } from "../shell/use-wide-screen";
import { PhoneActions, QUIET, WideActions, type LinkActionsProps } from "./LinkActions";

type LinkBarProps = {
  // The site, with the reading time once an article is in.
  meta: { site: string; minutes: number | null } | null;
  loading: boolean;
  onBack: () => void;
  // Null until the link itself has loaded.
  actions: LinkActionsProps | null;
};

// Sticky, so the link's actions stay in reach however far down the page is read.
export function LinkBar({ meta, loading, onBack, actions }: LinkBarProps) {
  const wide = useWideScreen();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="relative flex h-14 items-center gap-1 px-1.5 md:h-[60px] md:gap-2.5 md:px-5">
        <BackButton onBack={onBack} />
        <p className="flex min-w-0 flex-1 items-center gap-2 px-1 text-[13px] text-muted-foreground md:justify-center">
          {meta ? <ReadingMeta site={meta.site} minutes={meta.minutes} /> : null}
        </p>
        {actions ? wide ? <WideActions {...actions} /> : <PhoneActions {...actions} /> : null}
        {loading ? <LoadingBar /> : null}
      </div>
    </header>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <Button variant="ghost" onClick={onBack} className={cn(QUIET, "h-11 shrink-0 gap-2 px-2.5 text-sm font-bold text-foreground md:h-[38px]")}>
      <ArrowLeft aria-hidden strokeWidth={2} className="size-[17px]" />
      <span className="max-md:sr-only">Back</span>
    </Button>
  );
}

function ReadingMeta({ site, minutes }: { site: string; minutes: number | null }) {
  return (
    <>
      <span aria-hidden className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] bg-accent text-[10px] font-bold text-foreground">
        {tileFor(site).letter}
      </span>
      <span className="truncate">
        {site}
        {minutes === null ? null : ` · ${String(minutes)} min read`}
      </span>
    </>
  );
}

function LoadingBar() {
  return (
    <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
      <span className="absolute inset-y-0 left-0 w-[40%] animate-reader-bar bg-primary" />
    </span>
  );
}
