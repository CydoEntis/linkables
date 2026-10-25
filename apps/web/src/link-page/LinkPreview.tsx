import type { SavedLink } from "@linkables/shared/links";
import type { Ref } from "react";
import { Button } from "@/components/ui/button";
import { domainOf, savedOnLabel } from "../links/link-display";
import { OpenOriginal } from "../reader/OpenOriginal";
import { CollectionTags } from "./CollectionTags";
import { LinkMedia } from "./LinkMedia";
import { LinkTitle } from "./LinkTitle";
import { NoteField } from "./NoteField";

type LinkPreviewProps = {
  link: SavedLink;
  titleRef: Ref<HTMLHeadingElement>;
  noteRef: Ref<HTMLTextAreaElement>;
  // Set when the article could not be fetched (not when the page has none).
  onRetryReader?: (() => void) | undefined;
};

// What the page shows when there is no article to read: a video, a paywall, a
// file, or a page with nothing to pull out.
export function LinkPreview({ link, titleRef, noteRef, onRetryReader }: LinkPreviewProps) {
  return (
    <div className="mx-auto flex max-w-[700px] animate-fade-up flex-col gap-5 px-[18px] pt-5 pb-16 md:px-8 md:pt-12 md:pb-[120px]">
      <LinkMedia link={link} />
      <div className="flex flex-col gap-2">
        <LinkTitle link={link} titleRef={titleRef} />
        <p className="text-[13.5px] text-muted-foreground">
          {domainOf(link.originalUrl)} · {savedOnLabel(link, Date.now())}
        </p>
        <PageDescription text={link.resource.description} />
        <CollectionTags link={link} />
      </div>
      <OpenOriginal url={link.originalUrl} variant="default" className="h-[46px] gap-2 self-start px-5 text-[14.5px] font-bold">
        {isYouTubeVideo(link) ? "Watch on YouTube" : "Open original"}
        <span aria-hidden>↗</span>
      </OpenOriginal>
      {onRetryReader ? <ReaderProblem onRetry={onRetryReader} /> : null}
      <NoteField link={link} textareaRef={noteRef} />
    </div>
  );
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be"]);

function isYouTubeVideo(link: SavedLink): boolean {
  return link.resource.kind === "video" && YOUTUBE_HOSTS.has(domainOf(link.originalUrl));
}

// The page's own text (its og:description). A summary, when it comes, must stay apart from it so neither passes for the other.
function PageDescription({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <section aria-label="From the page" className="pt-1">
      <p className="text-[15px] leading-[1.55] text-description-foreground wrap-anywhere">{text}</p>
    </section>
  );
}

function ReaderProblem({ onRetry }: { onRetry: () => void }) {
  return (
    <p role="alert" className="flex flex-wrap items-center gap-2 text-[13.5px] text-muted-foreground">
      Couldn't get the article.
      <Button variant="ghost" size="touch" onClick={onRetry} className="h-9 max-md:h-11">
        Try again
      </Button>
    </p>
  );
}
