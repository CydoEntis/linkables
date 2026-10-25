import { useEffect } from "react";
import { useLinksUi } from "./links-ui-store";

// Coming back from a link's page puts focus on that link's row, so keyboard
// users carry on from where they were. preventScroll keeps the restored scroll.
export function useFocusReturningRow(rowsShown: boolean) {
  useEffect(() => {
    if (!rowsShown) return;
    const linkId = useLinksUi.getState().takeReturnFocusId();
    if (linkId === null) return;
    document.querySelector<HTMLElement>(`[data-row-link][data-link-id="${CSS.escape(linkId)}"]`)?.focus({ preventScroll: true });
  }, [rowsShown]);
}
