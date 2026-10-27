import { isApiError } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import type { SavedLink } from "@linkables/shared/links";
import type { ReaderArticle, ReaderView } from "@linkables/shared/reader";
import type { UseQueryResult } from "@tanstack/react-query";
import { isPending } from "../links/use-links";
import type { LinkState } from "./use-link";

// The part of the reader query the page decides on.
export type ReaderState = Pick<UseQueryResult<ReaderView>, "data" | "isLoading" | "isError" | "error">;

export type PageView =
  | { kind: "loading"; label: string }
  | { kind: "deleted" }
  | { kind: "gone" }
  | { kind: "failed"; retry: () => void }
  | { kind: "article"; link: SavedLink; article: ReaderArticle; url: string }
  // readerFailed: the article could not be fetched, which is not the same as the page having none.
  | { kind: "preview"; link: SavedLink; readerFailed: boolean };

// Videos and files have no article, so their reader is never asked for. A link
// whose details are still being fetched may turn out to be either; until then
// it shows its preview.
export function mayHaveArticle(link: SavedLink): boolean {
  return link.resource.kind !== "video" && link.resource.kind !== "other" && !isPending(link);
}

// previewShown: the preview is already on screen, so a reader that only now
// starts (a link whose details just landed) does not blank it with a skeleton.
// editing: a field in that preview has focus; the article waits until it is left,
// so a rename or note being typed is never torn away.
export type PreviewHold = { previewShown: boolean; editing: boolean };

export function pageView(link: LinkState, reader: ReaderState, { previewShown, editing }: PreviewHold): PageView {
  if (link.status === "loading") return { kind: "loading", label: "Loading…" };
  if (link.status !== "found") return link.status === "failed" ? { kind: "failed", retry: link.retry } : { kind: link.status };
  if (reader.data?.status === "ok" && !(previewShown && editing)) {
    return { kind: "article", link: link.link, article: reader.data.article, url: reader.data.url };
  }
  if (reader.isLoading && !previewShown) return { kind: "loading", label: "Getting the article…" };
  const readerFailed = reader.isError && !isApiError(reader.error, ERROR_CODES.NOT_FOUND);
  return { kind: "preview", link: link.link, readerFailed };
}
