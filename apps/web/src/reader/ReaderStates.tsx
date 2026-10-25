import { BookOpen, ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { OpenOriginal } from "./OpenOriginal";

const SHIMMER = "animate-[shimmer_1.4s_linear_infinite] bg-[linear-gradient(90deg,#1a1a1a,#262626,#1a1a1a)] bg-size-[200%_100%]";

export function ArticleSkeleton() {
  return (
    <div role="status" className="mx-auto flex max-w-[700px] flex-col gap-3.5 px-[22px] pt-[26px] pb-16 md:px-8 md:pt-14">
      <span className="text-[13px] text-muted-foreground">Getting the article…</span>
      <span aria-hidden className={`h-10 w-[90%] rounded-[10px] ${SHIMMER}`} />
      <span aria-hidden className={`h-10 w-[55%] rounded-[10px] ${SHIMMER}`} />
      <span aria-hidden className={`my-3.5 aspect-video rounded-[16px] ${SHIMMER}`} />
      {[100, 94, 80].map((width) => (
        <span key={width} aria-hidden className="h-3.5 rounded-[5px] bg-[#1c1c1c]" style={{ width: `${String(width)}%` }} />
      ))}
    </div>
  );
}

export function Unavailable({ url }: { url: string }) {
  return (
    <StateView
      title="Reader view isn't available for this page"
      detail="It's a video, it's behind a paywall, or there's no article on it to pull out."
    >
      <OpenOriginal url={url} variant="default" className="mt-1.5 h-[46px] gap-2 px-5 text-[14.5px]">
        Open original
        <ExternalLink aria-hidden strokeWidth={2.2} className="size-3.5" />
      </OpenOriginal>
    </StateView>
  );
}

export function Problem({ title, detail, onRetry }: { title: string; detail?: string; onRetry?: () => void }) {
  return (
    <StateView title={title} detail={detail} alert>
      {onRetry ? (
        <Button variant="ghost" size="touch" onClick={onRetry} className="mt-1.5">
          Try again
        </Button>
      ) : null}
    </StateView>
  );
}

type StateViewProps = { title: string; detail?: string | undefined; alert?: boolean; children: ReactNode };

function StateView({ title, detail, alert = false, children }: StateViewProps) {
  return (
    <div
      role={alert ? "alert" : undefined}
      className="flex min-h-[calc(100svh-60px)] animate-fade-up flex-col items-center justify-center gap-3.5 px-6 py-10 text-center"
    >
      <span aria-hidden className="flex size-16 items-center justify-center rounded-[18px] border border-line-strong bg-card text-muted-foreground">
        <BookOpen strokeWidth={2} className="size-[26px]" />
      </span>
      <p className="max-w-[440px] text-[24px] leading-[1.25] font-bold tracking-[-0.02em] text-balance">{title}</p>
      {detail ? <p className="max-w-[400px] text-[15px] leading-[1.55] text-muted-foreground">{detail}</p> : null}
      {children}
    </div>
  );
}
