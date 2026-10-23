import { useEffect, useEffectEvent } from "react";
import { saveUrlSchema } from "./save-link-form";
import { useSaveLink } from "./use-save-link";

function isEditable(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select") !== null);
}

// ⌘V / Ctrl+V anywhere outside a field saves a pasted link (handoff, web main view).
export function usePasteToSave(): void {
  const save = useSaveLink();
  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    if (isEditable(event.target)) return;
    const parsed = saveUrlSchema.safeParse(event.clipboardData?.getData("text") ?? "");
    if (!parsed.success) return;
    event.preventDefault();
    save(parsed.data);
  });

  useEffect(() => {
    window.addEventListener("paste", onPaste);
    return () => { window.removeEventListener("paste", onPaste); };
  }, []);
}
