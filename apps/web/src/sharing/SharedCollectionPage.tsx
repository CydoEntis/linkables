import { ApiError, isApiError } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import { getRouteApi } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { INVITE_ONLY, primaryCta } from "../config/access";
import { useWideScreen } from "../link-details/use-wide-screen";
import { Mark, MarkWordmark } from "../marketing/Mark";
import { SharedCollection } from "./SharedCollection";
import { SharedLoadFailed, SharedLoading, SharedUnavailable } from "./SharedStates";
import { useSharedCollection } from "./use-share";

const route = getRouteApi("/s/$token");
const CTA = primaryCta(INVITE_ONLY);

export function SharedCollectionPage() {
  const { token } = route.useParams();
  const shared = useSharedCollection(token);
  const wide = useWideScreen();
  useNoIndex();

  let body: ReactNode;
  if (shared.isPending) body = <SharedLoading wide={wide} />;
  else if (shared.isSuccess) body = <SharedCollection collection={shared.data} wide={wide} />;
  else if (isApiError(shared.error, ERROR_CODES.NOT_FOUND)) body = <SharedUnavailable />;
  else {
    const requestId = shared.error instanceof ApiError ? shared.error.requestId : undefined;
    body = <SharedLoadFailed requestId={requestId} onRetry={() => void shared.refetch()} />;
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1200px] flex-col px-5 pb-[34px] md:px-12 md:pt-4 md:pb-10">
      <header className="flex h-[60px] items-center justify-between gap-3">
        <a href="/" aria-label="linkables home" className="inline-flex min-h-11 items-center">
          <MarkWordmark size={24} textClass="text-[19px] tracking-[-0.035em]" />
        </a>
        <a href={CTA.href} className={buttonVariants({ variant: "ghost", className: "h-[38px] px-3.5 text-[13.5px] font-bold" })}>
          {CTA.label}
        </a>
      </header>
      <main className="flex-1">
        {body}
        {shared.isSuccess ? <MadeWithLinkables /> : null}
      </main>
      <footer className="flex justify-center gap-5 pt-[30px] pb-2 text-[12.5px] text-muted-foreground">
        <a href="/privacy" className="hover:text-foreground">Privacy</a>
        <a href="/terms" className="hover:text-foreground">Terms</a>
        <a href="/" className="hover:text-foreground">linkables.app</a>
      </footer>
    </div>
  );
}

// The app shell is already noindex; a shared collection also asks crawlers not to follow its links.
function useNoIndex() {
  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robots === null) return;
    const previous = robots.content;
    robots.content = "noindex, nofollow";
    return () => { robots.content = previous; };
  }, []);
}

function MadeWithLinkables() {
  return (
    <section
      aria-label="Made with linkables"
      className="mt-9 flex flex-wrap items-center justify-between gap-6 rounded-3xl border border-border bg-card px-[22px] py-6 md:mt-14 md:px-10 md:py-9"
    >
      <div className="flex max-w-[560px] min-w-0 flex-col gap-2.5">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
          <Mark size={16} />
          Made with linkables
        </p>
        <p className="text-[24px] leading-[1.15] font-bold tracking-[-0.025em] md:text-[30px]">Keep your own links like this.</p>
        <p className="text-[15px] leading-[1.55] text-muted-foreground">
          Save anything from your phone or browser and find it later on any device.{INVITE_ONLY ? " linkables is invite-only for now." : null}
        </p>
      </div>
      <a
        href={CTA.href}
        className={buttonVariants({
          className: "h-[54px] gap-3.5 rounded-[14px] bg-foreground pr-3 pl-[22px] text-base text-[#121212] hover:bg-white",
        })}
      >
        {CTA.label}
        <span aria-hidden className="flex size-[30px] items-center justify-center rounded-full bg-[#121212] text-foreground">
          <ArrowRight className="size-[15px]" strokeWidth={2.6} />
        </span>
      </a>
    </section>
  );
}
