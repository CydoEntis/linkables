import { isApiError } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import type { SavedLink } from "@linkables/shared/links";
import type { ReaderArticle } from "@linkables/shared/reader";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Pin, Share } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDetailsLink } from "../link-details/use-details-link";
import { domainOf } from "../links/link-display";
import { copyLink } from "../links/share-link";
import { usePinLink } from "../links/use-pin-link";
import { QUIET, ReaderBar } from "./ReaderBar";
import { ArticleSkeleton, Problem, Unavailable } from "./ReaderStates";
import { ReaderBlocks } from "./ReaderBlocks";
import { readTextSize, storeTextSize, type TextSize } from "./text-size";
import { useReader } from "./use-reader";

const route = getRouteApi("/l/$linkId/read");

export function ReaderPage() {
  const { linkId } = route.useParams();
  const reader = useReader(linkId);
  const [textSize, setTextSize] = useState(readTextSize);
  const changeTextSize = (size: TextSize) => {
    setTextSize(size);
    storeTextSize(size);
  };
  const view = reader.data?.status === "ok" ? reader.data : null;

  let body: ReactNode;
  if (reader.isPending) body = <ArticleSkeleton />;
  else if (view) body = <Article linkId={linkId} article={view.article} url={view.url} textSize={textSize} />;
  else if (reader.data?.status === "unavailable") body = <Unavailable url={reader.data.url} />;
  else if (isApiError(reader.error, ERROR_CODES.NOT_FOUND)) body = <Problem title="Couldn't find this link" detail="It may have been deleted." />;
  else body = <Problem title="Couldn't load the reader view" onRetry={() => void reader.refetch()} />;

  return (
    <div className="min-h-svh">
      <ReaderBar
        linkId={linkId}
        loading={reader.isPending}
        article={view ? { site: siteOf(view.article, view.url), minutes: view.article.minutes, url: view.url } : null}
        textSize={textSize}
        onTextSize={changeTextSize}
      />
      <main className="pb-[env(safe-area-inset-bottom)]">{body}</main>
    </div>
  );
}

function siteOf(article: ReaderArticle, url: string): string {
  return article.siteName ?? domainOf(url);
}

// Phone sizes first, then desktop; the measure widens with the largest size.
const BODY_SIZE = ["text-[16px] md:text-[17px]", "text-[18px] md:text-[19px]", "text-[20px] md:text-[22px]"] as const;

type ArticleProps = { linkId: string; article: ReaderArticle; url: string; textSize: TextSize };

function Article({ linkId, article, url, textSize }: ArticleProps) {
  useDocumentTitle(article.title);
  const byline = [article.byline, `${String(article.minutes)} min read`].filter(Boolean).join(" · ");
  return (
    <article
      className={cn(
        "mx-auto animate-[fade-in_0.45s_ease-out_both] px-[22px] pt-[26px] pb-16 font-reader leading-[1.7] text-reader-foreground wrap-break-word transition-[font-size] duration-200 md:px-8 md:pt-14 md:pb-[120px]",
        BODY_SIZE[textSize],
        textSize === 2 ? "max-w-[760px]" : "max-w-[700px]",
      )}
    >
      <header className="mb-7 font-sans">
        <p className="mb-3.5 text-[13px] font-semibold text-muted-foreground">{siteOf(article, url)}</p>
        {article.title ? (
          <h1 className="mb-3.5 text-[30px] leading-[1.1] font-bold tracking-[-0.028em] text-balance text-foreground md:text-[44px]">{article.title}</h1>
        ) : null}
        <p className="text-[14px] text-muted-foreground">{byline}</p>
      </header>
      <ReaderBlocks blocks={article.blocks} />
      {article.truncated ? (
        <p className="mt-8 font-sans text-[15px] text-muted-foreground">
          This article is too long to show in full here. The rest is on the original page.
        </p>
      ) : null}
      <ArticleEnd linkId={linkId} />
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

const END_ACTION = "h-[42px] gap-2 px-4 text-[14px] font-bold";

function ArticleEnd({ linkId }: { linkId: string }) {
  const details = useDetailsLink(linkId);
  return (
    <footer className="mt-11 flex flex-wrap gap-2 border-t border-border pt-6 font-sans">
      {details.status === "found" ? <LinkActions link={details.link} /> : null}
      <Link to="/" className={buttonVariants({ variant: "ghost", className: cn(QUIET, END_ACTION) })}>
        Back to my links
      </Link>
    </footer>
  );
}

function LinkActions({ link }: { link: SavedLink }) {
  const pin = usePinLink(link);
  return (
    <>
      <Button variant="ghost" aria-pressed={pin.pinned} onClick={pin.toggle} className={END_ACTION}>
        <Pin aria-hidden strokeWidth={2} className={cn("size-[15px]", pin.pinned && "fill-current")} />
        {pin.pinned ? "Pinned" : "Pin"}
      </Button>
      <Button variant="ghost" onClick={() => void copyLink(link.originalUrl)} className={END_ACTION}>
        <Share aria-hidden strokeWidth={2} className="size-[15px]" />
        Share
      </Button>
    </>
  );
}
