import { isApiError } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import type { ReaderArticle } from "@linkables/shared/reader";
import { getRouteApi, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { domainOf, safeHref } from "../links/link-display";
import { ReaderBlocks } from "./ReaderBlocks";
import { useReader } from "./use-reader";

const route = getRouteApi("/read/$linkId");

export function ReaderPage() {
  const { linkId } = route.useParams();
  const reader = useReader(linkId);
  // The unavailable state has its own Open button, so the bar's would repeat it.
  const url = reader.data?.status === "ok" ? reader.data.url : undefined;

  let body: ReactNode;
  if (reader.isPending) body = <ArticleSkeleton />;
  else if (reader.data?.status === "ok") body = <Article article={reader.data.article} url={reader.data.url} />;
  else if (reader.data?.status === "unavailable") body = <Unavailable url={reader.data.url} />;
  else if (isApiError(reader.error, ERROR_CODES.NOT_FOUND)) body = <Problem title="Couldn't find this link" detail="It may have been deleted." />;
  else body = <Problem title="Couldn't load the reader view" onRetry={() => void reader.refetch()} />;

  return (
    <div className="min-h-svh">
      <ReaderBar linkId={linkId} url={url} />
      <main className="mx-auto w-full max-w-[680px] px-4 pt-6 pb-[calc(64px+env(safe-area-inset-bottom))] md:pt-12">{body}</main>
    </div>
  );
}

// Back returns to wherever the reader was opened from; an address opened
// directly has nowhere to go back to, so it lands on the link's details.
function ReaderBar({ linkId, url }: { linkId: string; url: string | undefined }) {
  const router = useRouter();
  const back = () => {
    if (router.history.canGoBack()) router.history.back();
    else void router.navigate({ to: "/", search: { link: linkId } });
  };
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-[680px] items-center gap-2 px-2 py-1.5 md:py-2.5">
        <button
          type="button"
          onClick={back}
          className="flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-9"
        >
          <ArrowLeft aria-hidden strokeWidth={2.2} className="size-4" />
          Back
        </button>
        <span className="flex-1" />
        {url ? <OpenOriginal url={url} /> : null}
      </div>
    </header>
  );
}

function OpenOriginal({ url, label = "Open original" }: { url: string; label?: string }) {
  const href = safeHref(url);
  if (href === undefined) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 items-center rounded-md bg-primary px-4 text-[13.5px] font-bold text-primary-foreground md:min-h-9"
    >
      {label} ↗<span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function Article({ article, url }: { article: ReaderArticle; url: string }) {
  useDocumentTitle(article.title);
  const meta = [article.siteName ?? domainOf(url), `${String(article.minutes)} min read`].join(" · ");
  return (
    <article className="text-[17px] leading-[1.7] text-foreground/90 wrap-break-word md:text-[18px]">
      <header className="mb-8 flex flex-col gap-2">
        <p className="text-[13px] font-semibold text-muted-foreground">{meta}</p>
        {article.title ? (
          <h1 className="text-[28px] leading-[1.2] font-bold tracking-[-0.02em] text-foreground md:text-[34px]">{article.title}</h1>
        ) : null}
        {article.byline ? <p className="text-[14px] text-muted-foreground">{article.byline}</p> : null}
      </header>
      <ReaderBlocks blocks={article.blocks} />
      {article.truncated ? (
        <p className="mt-8 border-t border-border pt-6 text-[15px] text-muted-foreground">
          This article is too long to show in full here. The rest is on the original page.
        </p>
      ) : null}
    </article>
  );
}

function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · linkables`;
    return () => { document.title = previous; };
  }, [title]);
}

function Unavailable({ url }: { url: string }) {
  return (
    <div className="flex flex-col items-start gap-3 py-10">
      <p className="text-[19px] font-bold">Reader view isn't available for this page</p>
      <p className="text-[15px] text-muted-foreground">It may be a video, a file, or a page without an article.</p>
      <div className="mt-2">
        <OpenOriginal url={url} label="Open" />
      </div>
    </div>
  );
}

function Problem({ title, detail, onRetry }: { title: string; detail?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-10">
      <p className="text-[19px] font-bold">{title}</p>
      {detail ? <p className="text-[15px] text-muted-foreground">{detail}</p> : null}
      {onRetry ? (
        <Button variant="ghost" size="touch" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <div role="status" aria-label="Loading the article" className="flex animate-pulse flex-col gap-3">
      <div className="h-3.5 w-40 rounded bg-muted" />
      <div className="h-8 w-11/12 rounded bg-muted" />
      <div className="mb-6 h-8 w-2/3 rounded bg-muted" />
      {[100, 96, 98, 90, 60].map((width, index) => (
        <div key={index} className="h-4 rounded bg-muted" style={{ width: `${String(width)}%` }} />
      ))}
    </div>
  );
}
