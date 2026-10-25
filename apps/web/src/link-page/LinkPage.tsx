import { getRouteApi } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { AddToSheet } from "../collections/AddToSheet";
import { displayTitle, domainOf } from "../links/link-display";
import { useLinksUi } from "../links/links-ui-store";
import { useDeleteLink } from "../links/use-delete-link";
import { ReaderArticle, siteOf } from "../reader/ReaderArticle";
import { ArticleSkeleton, Problem } from "../reader/ReaderStates";
import { readTextSize, storeTextSize, type TextSize } from "../reader/text-size";
import { useReader } from "../reader/use-reader";
import { LinkBar } from "./LinkBar";
import type { LinkActionsProps } from "./LinkActions";
import { LinkPreview } from "./LinkPreview";
import { mayHaveArticle, pageView, type PageView } from "./page-view";
import { useEscapeGoesBack, useGoBack } from "./use-go-back";
import { useLink } from "./use-link";

const route = getRouteApi("/l/$linkId");

// Every link's own page: its article when the reader has one, else its preview,
// under a bar that keeps the link's actions in reach.
export function LinkPage() {
  const { linkId } = route.useParams();
  // Keyed, so another link's page starts afresh: title focus, note, open editors.
  return <LinkPageFor key={linkId} linkId={linkId} />;
}

function LinkPageFor({ linkId }: { linkId: string }) {
  const state = useLink(linkId);
  const found = state.status === "found" ? state.link : null;
  const reader = useReader(linkId, found !== null && mayHaveArticle(found));
  const view = pageView(state, reader);
  const [textSize, setTextSize] = useState(readTextSize);
  const goBack = useGoBack();
  const deleteLink = useDeleteLink();
  const titleRef = useFocusOnArrival();
  const noteRef = useRef<HTMLTextAreaElement | null>(null);
  useEscapeGoesBack(goBack);
  useReturnFocusToRow(linkId);
  useDocumentTitle(view.kind === "article" ? (view.article.title ?? displayTitle(view.link).text) : found ? displayTitle(found).text : null);

  const actions: LinkActionsProps | null = found && {
    link: found,
    textSize: view.kind === "article" ? { value: textSize, onChange: (size) => { setTextSize(size); storeTextSize(size); } } : null,
    onDelete: () => {
      goBack();
      deleteLink(found.id);
    },
    onNoteInline: view.kind === "preview" ? () => noteRef.current?.focus() : null,
  };

  return (
    <div className="min-h-svh">
      <LinkBar meta={barMeta(view, found)} loading={view.kind === "loading"} onBack={goBack} actions={actions} />
      <main className="pb-[env(safe-area-inset-bottom)]">
        <PageBody view={view} textSize={textSize} titleRef={titleRef} noteRef={noteRef} onRetryReader={() => void reader.refetch()} />
      </main>
      <AddToSheet />
    </div>
  );
}

type PageBodyProps = {
  view: PageView;
  textSize: TextSize;
  titleRef: Ref<HTMLHeadingElement>;
  noteRef: Ref<HTMLTextAreaElement>;
  onRetryReader: () => void;
};

function PageBody({ view, textSize, titleRef, noteRef, onRetryReader }: PageBodyProps) {
  switch (view.kind) {
    case "loading":
      return <ArticleSkeleton label={view.label} />;
    case "deleted":
      return null;
    case "gone":
      return <Problem title="Couldn't find this link" detail="It may have been deleted." />;
    case "failed":
      return <Problem title="Couldn't load this link" onRetry={view.retry} />;
    case "article":
      return <ReaderArticle article={view.article} url={view.url} fallbackTitle={displayTitle(view.link).text} textSize={textSize} titleRef={titleRef} />;
    case "preview":
      return <LinkPreview link={view.link} titleRef={titleRef} noteRef={noteRef} onRetryReader={view.readerFailed ? onRetryReader : undefined} />;
  }
}

function barMeta(view: PageView, link: { originalUrl: string } | null) {
  if (view.kind === "article") return { site: siteOf(view.article, view.url), minutes: view.article.minutes };
  return link ? { site: domainOf(link.originalUrl), minutes: null } : null;
}

// Focus lands on the title when the page arrives, unless the user has already
// moved it (into the bar, say) while the page was loading.
function useFocusOnArrival() {
  const done = useRef(false);
  return useCallback((title: HTMLHeadingElement | null) => {
    if (title === null || done.current) return;
    done.current = true;
    const active = document.activeElement;
    if (active === null || active === document.body) title.focus({ preventScroll: true });
  }, []);
}

// The list focuses this link's row when it shows again (links/use-focus-returning-row.ts).
function useReturnFocusToRow(linkId: string) {
  useEffect(() => () => { useLinksUi.getState().setReturnFocusId(linkId); }, [linkId]);
}

function useDocumentTitle(title: string | null) {
  useEffect(() => {
    if (title === null) return;
    const previous = document.title;
    document.title = `${title} · linkables`;
    return () => { document.title = previous; };
  }, [title]);
}
