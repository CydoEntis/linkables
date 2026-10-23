export const WELCOME_SEEN_KEY = "linkables.save-anywhere-seen";

// Also kept in memory, so storage that refuses the write cannot send Skip
// straight back to the prompt for the rest of the visit.
let seenThisVisit = false;

// Once per device, a convenience only: storage that is blocked (private mode,
// cleared site data) reads as seen, so the prompt never shows on every visit.
export function welcomeSeen(): boolean {
  if (seenThisVisit) return true;
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) !== null;
  } catch (error) {
    if (error instanceof DOMException) return true;
    throw error;
  }
}

export function markWelcomeSeen(): void {
  seenThisVisit = true;
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}
