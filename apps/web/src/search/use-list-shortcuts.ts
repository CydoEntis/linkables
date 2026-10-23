import { useEffect, useEffectEvent } from "react";
import { isEditable } from "../links/use-paste-to-save";

// The bar on wide screens, the phone field on narrow ones: whichever is showing.
export function focusSearchField(): HTMLInputElement | undefined {
  const fields = document.querySelectorAll<HTMLInputElement>("[data-search-field]");
  const field = [...fields].find((candidate) => candidate.checkVisibility());
  field?.focus();
  return field;
}

type ListShortcuts = { onPalette: () => void; onHelp: () => void };

// "/" focuses search and "?" lists the shortcuts, except while typing in a field;
// Cmd/Ctrl+K opens the command palette from anywhere (brief 5.9).
export function useListShortcuts({ onPalette, onHelp }: ListShortcuts): void {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
      event.preventDefault();
      onPalette();
      return;
    }
    if (event.metaKey || event.ctrlKey || event.altKey || isEditable(event.target)) return;
    if (event.key === "/") {
      event.preventDefault();
      focusSearchField();
    } else if (event.key === "?") {
      event.preventDefault();
      onHelp();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); };
  }, []);
}
