import { useEffect } from "react";
import { isEditable } from "../links/use-paste-to-save";

// The bar on wide screens, the phone field on narrow ones: whichever is showing.
export function focusSearchField(): void {
  const fields = document.querySelectorAll<HTMLInputElement>("[data-search-field]");
  [...fields].find((field) => field.checkVisibility())?.focus();
}

// "/" focuses search (brief 5.9), except while typing in another field.
export function useSlashToFocus(): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
      event.preventDefault();
      focusSearchField();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, []);
}
