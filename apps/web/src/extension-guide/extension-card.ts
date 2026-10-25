export const EXTENSION_CARD_DISMISSED_KEY = "linkables.extension-card-dismissed";

// Also kept in memory, so storage that refuses the write still hides the card for the visit.
let dismissedThisVisit = false;

// Storage is a convenience: when it is blocked the card shows again next visit.
export function extensionCardDismissed(): boolean {
  if (dismissedThisVisit) return true;
  try {
    return localStorage.getItem(EXTENSION_CARD_DISMISSED_KEY) !== null;
  } catch (error) {
    if (error instanceof DOMException) return false;
    throw error;
  }
}

export function dismissExtensionCard(): void {
  dismissedThisVisit = true;
  try {
    localStorage.setItem(EXTENSION_CARD_DISMISSED_KEY, "1");
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}
