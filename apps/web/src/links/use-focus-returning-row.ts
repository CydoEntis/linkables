import { useEffect, useEffectEvent } from "react";
import { useLinksUi } from "./links-ui-store";

// Coming back from a link's page puts focus on that link's row, so keyboard
// users carry on from where they were; a link deleted there hands focus to the
// next row (or the one before), and an emptied list to its heading.
// preventScroll keeps the scroll the router restored.
// loadedIds: the list's links in order, deleted ones still among them.
export function useFocusReturningRow(listLoaded: boolean, loadedIds: readonly string[]) {
  const focusReturningRow = useEffectEvent(() => {
    const linkId = useLinksUi.getState().takeReturnFocusId();
    if (linkId === null) return;
    const { deletingIds } = useLinksUi.getState();
    const target = deletingIds.includes(linkId) ? neighbourId(loadedIds, linkId, deletingIds) : linkId;
    const row = target === null ? null : document.querySelector<HTMLElement>(`[data-row-link][data-link-id="${CSS.escape(target)}"]`);
    (row ?? listHeading())?.focus({ preventScroll: true });
  });
  useEffect(() => {
    if (listLoaded) focusReturningRow();
  }, [listLoaded]);
}

function neighbourId(ids: readonly string[], linkId: string, gone: readonly string[]): string | null {
  const index = ids.indexOf(linkId);
  const stays = (id: string) => !gone.includes(id);
  return ids.slice(index + 1).find(stays) ?? ids.slice(0, Math.max(index, 0)).findLast(stays) ?? null;
}

function listHeading(): HTMLElement | null {
  const heading = document.querySelector<HTMLElement>("main h1");
  if (heading && !heading.hasAttribute("tabindex")) heading.tabIndex = -1;
  return heading;
}
