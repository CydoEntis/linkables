import { Link2Off, RefreshCw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";

const SHIMMER = "animate-[shimmer_1.4s_linear_infinite] bg-[linear-gradient(90deg,#1d1d1d,#262626,#1d1d1d)] bg-size-[200%_100%]";

export function SharedLoading({ wide }: { wide: boolean }) {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="flex flex-col gap-3.5 pt-[18px] pb-[22px] md:pt-11 md:pb-8">
        <span className={`h-7 w-[150px] rounded-full ${SHIMMER}`} />
        <span className={`h-10 w-[60%] rounded-[14px] md:h-14 ${SHIMMER}`} />
        <span className="h-4 w-[120px] rounded-md bg-card" />
      </div>
      <div aria-hidden className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: wide ? 6 : 3 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-2xl bg-card">
            <div className={`aspect-[16/10] ${SHIMMER}`} />
            <div className="flex flex-col gap-2.5 px-[18px] pt-4 pb-5">
              <span className="h-3 w-[40%] rounded-[5px] bg-[#242424]" />
              <span className="h-[18px] w-[85%] rounded-md bg-[#242424]" />
              <span className="h-3 w-[70%] rounded-[5px] bg-[#202020]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StateMessage({ Icon, title, text, children }: { Icon: LucideIcon; title: string; text: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[560px] animate-fade-up flex-col items-center justify-center gap-3.5 text-center md:min-h-[600px]">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-[18px] border border-line-strong bg-card text-muted-foreground">
        <Icon className="size-[26px]" />
      </span>
      <h1 className="max-w-[460px] text-[26px] font-bold tracking-[-0.02em] text-balance">{title}</h1>
      <p className="max-w-[420px] text-[15px] leading-[1.55] text-muted-foreground">{text}</p>
      {children}
    </div>
  );
}

export function SharedUnavailable() {
  return (
    <StateMessage
      Icon={Link2Off}
      title="This shared collection isn't available"
      text="The link may have been turned off, or it isn't quite right. Ask whoever sent it for a new one."
    >
      <a href="/" className={buttonVariants({ className: "mt-1.5 h-[46px] bg-foreground px-[18px] text-[14.5px] text-[#121212] hover:bg-white" })}>
        What is linkables?
      </a>
    </StateMessage>
  );
}

export function SharedLoadFailed({ requestId, onRetry }: { requestId: string | undefined; onRetry: () => void }) {
  return (
    <StateMessage
      Icon={RefreshCw}
      title="Couldn't load this collection"
      text="Check your connection and try again. If it keeps happening, the link may be broken."
    >
      <Button onClick={onRetry} className="mt-1.5 h-[46px] px-5 text-[14.5px]">
        <RefreshCw aria-hidden className="size-[15px]" />
        Try again
      </Button>
      {requestId ? <p className="font-mono text-[11.5px] text-subtle-foreground">Ref {requestId}</p> : null}
    </StateMessage>
  );
}
