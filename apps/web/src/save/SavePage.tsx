import type { SaveLinkResponse } from "@linkables/shared/links";
import { getRouteApi } from "@tanstack/react-router";
import { displayTitle } from "../links/link-display";
import { useLinks } from "../links/use-links";
import { SaveAnnouncement, SaveScreen } from "./SaveScreen";
import { extractSharedUrl } from "./shared-url";
import { useSharedSave } from "./use-shared-save";

const route = getRouteApi("/save");

export function SavePage() {
  const search = route.useSearch();
  return <SharedSave sharedUrl={extractSharedUrl(search)} />;
}

export function SharedSave({ sharedUrl }: { sharedUrl: string | null }) {
  const { state, saveUrl, retry, undo, undoing } = useSharedSave(sharedUrl);
  const screen = { state, onUndo: undo, undoing, onRetry: retry, onSaveUrl: saveUrl };
  return (
    <>
      {state.status === "saved" ? <SavedScreen {...screen} link={state.link} /> : <SaveScreen {...screen} />}
      <SaveAnnouncement state={state} />
    </>
  );
}

// The list query already polls pending rows, so the title appears once the metadata lands.
function SavedScreen({ link, ...screen }: Parameters<typeof SaveScreen>[0] & { link: SaveLinkResponse }) {
  const { query } = useLinks("all");
  const listed = query.data?.pages.flatMap((page) => page.items).find((item) => item.id === link.id);
  return <SaveScreen {...screen} title={displayTitle(listed ?? link).text} />;
}
