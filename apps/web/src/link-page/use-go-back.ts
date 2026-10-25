import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { isEditable } from "../links/use-paste-to-save";

// Back returns to the list the page was opened from, where the router restores
// its scroll; a page opened directly (a new tab, a bookmark) goes to All links.
export function useGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.history.canGoBack()) router.history.back();
    else void router.navigate({ to: "/", replace: true });
  }, [router]);
}

// Esc in a popover, menu or sheet closes only that; Esc in a field stays with the field.
const OPEN_LAYERS = "[data-slot=popover-content], [data-slot=dropdown-menu-content], [data-slot=sheet-content], [role=dialog]";

export function useEscapeGoesBack(goBack: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || isEditable(event.target)) return;
      if (event.target instanceof Element && event.target.closest(OPEN_LAYERS)) return;
      goBack();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); };
  }, [goBack]);
}
