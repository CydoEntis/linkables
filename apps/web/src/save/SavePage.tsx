import type { SaveLinkResponse } from "@linkables/shared/links";
import { getRouteApi } from "@tanstack/react-router";
import { useEffect } from "react";
import { displayTitle } from "../links/link-display";
import { useLinks } from "../links/use-links";
import { SaveScreen } from "./SaveScreen";
import { extractSharedUrl } from "./shared-url";
import { useSharedSave } from "./use-shared-save";

const route = getRouteApi("/save");

const POPUP_CLOSE_MS = 4000;

export function SavePage() {
  const search = route.useSearch();
  return <SharedSave sharedUrl={extractSharedUrl(search)} popup={search.popup === true} />;
}

export function SharedSave({ sharedUrl, popup }: { sharedUrl: string | null; popup: boolean }) {
  const { state, saveUrl, retry, undo, undoing } = useSharedSave(sharedUrl);
  useCloseWhenSaved(popup && state.status === "saved");

  const screen = { state, onUndo: undo, undoing, onRetry: retry, onSaveUrl: saveUrl };
  return state.status === "saved" ? <SavedScreen {...screen} link={state.link} /> : <SaveScreen {...screen} />;
}

// The list query already polls pending rows, so the title appears once the metadata lands.
function SavedScreen({ link, ...screen }: Parameters<typeof SaveScreen>[0] & { link: SaveLinkResponse }) {
  const { query } = useLinks("all");
  const listed = query.data?.pages.flatMap((page) => page.items).find((item) => item.id === link.id);
  return <SaveScreen {...screen} title={displayTitle(listed ?? link).text} />;
}

// The bookmark button opens /save in a popup; it closes unless the user starts using it.
function useCloseWhenSaved(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => { window.close(); }, POPUP_CLOSE_MS);
    const stay = () => { clearTimeout(timer); };
    window.addEventListener("pointerdown", stay, { once: true });
    window.addEventListener("keydown", stay, { once: true });
    return () => {
      stay();
      window.removeEventListener("pointerdown", stay);
      window.removeEventListener("keydown", stay);
    };
  }, [active]);
}
