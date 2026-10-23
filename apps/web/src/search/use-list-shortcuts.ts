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

// Another dialog (a sheet, the shortcut list, a share dialog) keeps the keyboard to itself.
function otherDialogOpen(): boolean {
  const dialog = document.querySelector("[role=dialog], [role=alertdialog]");
  return dialog !== null && dialog.closest("[data-command-palette]") === null;
}

// "/" focuses search and "?" lists the shortcuts, except while typing in a field;
// Cmd/Ctrl+K opens the command palette from anywhere but another dialog (brief 5.9).
export function useListShortcuts({ onPalette, onHelp }: ListShortcuts): void {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
      if (otherDialogOpen()) return;
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
