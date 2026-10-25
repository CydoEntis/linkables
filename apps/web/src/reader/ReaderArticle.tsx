import type { ReaderArticle as Article } from "@linkables/shared/reader";
import { Link } from "@tanstack/react-router";
import type { Ref } from "react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { domainOf } from "../links/link-display";
import { ReaderBlocks } from "./ReaderBlocks";
import type { TextSize } from "./text-size";

export function siteOf(article: Article, url: string): string {
  return article.siteName ?? domainOf(url);
}

// Phone sizes first, then desktop; the measure widens with the largest size.
const BODY_SIZE = ["text-[16px] md:text-[17px]", "text-[18px] md:text-[19px]", "text-[20px] md:text-[22px]"] as const;

type ReaderArticleProps = {
  article: Article;
  url: string;
  // The saved link's title, for an article that names none.
  fallbackTitle: string;
  textSize: TextSize;
  titleRef: Ref<HTMLHeadingElement>;
};

export function ReaderArticle({ article, url, fallbackTitle, textSize, titleRef }: ReaderArticleProps) {
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
        <h1
          ref={titleRef}
          tabIndex={-1}
          className="mb-3.5 text-[30px] leading-[1.1] font-bold tracking-[-0.028em] text-balance text-foreground outline-none md:text-[44px]"
        >
          {article.title ?? fallbackTitle}
        </h1>
        <p className="text-[14px] text-muted-foreground">{byline}</p>
      </header>
      <ReaderBlocks blocks={article.blocks} />
      {article.truncated ? (
        <p className="mt-8 font-sans text-[15px] text-muted-foreground">
          This article is too long to show in full here. The rest is on the original page.
        </p>
      ) : null}
      <footer className="mt-11 border-t border-border pt-6 font-sans">
        <Link
          to="/"
          className={buttonVariants({
            variant: "ghost",
            className: "h-[42px] bg-transparent px-4 text-[14px] font-bold text-muted-foreground inset-shadow-none hover:bg-muted hover:text-foreground",
          })}
        >
          Back to my links
        </Link>
      </footer>
    </article>
  );
}
