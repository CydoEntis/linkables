// A toolbar button is only an icon and a badge of up to 4 characters, so the
// handoff's lime "✓ Saved" pill becomes a lime ✓ badge on the tab's button.
// The badge is set per tab, and Chrome clears a tab's badge when it navigates,
// so a mark never outlives the page it was set for.

// --primary, oklch(0.89 0.19 125), and --primary-foreground in hex: the badge takes no oklch.
const LIME = "#bef050";
const INK = "#16200a";
// --destructive, oklch(0.72 0.16 25).
const RED = "#f97770";

const FLASH_MS = 2000;

async function setBadge(tabId: number, text: string, color: string): Promise<void> {
  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ tabId, color }),
    chrome.action.setBadgeTextColor({ tabId, color: INK }),
    chrome.action.setBadgeText({ tabId, text }),
  ]);
}

export async function markSaved(tabId: number, saved: boolean): Promise<void> {
  if (saved) await setBadge(tabId, "✓", LIME);
  else await chrome.action.setBadgeText({ tabId, text: "" });
}

// Answers a save made away from any linkables page (the right-click menu): a ✓ or
// a red ! for two seconds, then the tab's own mark again.
export async function flashSaveResult(tabId: number, ok: boolean): Promise<void> {
  const before = await chrome.action.getBadgeText({ tabId });
  await setBadge(tabId, ok ? "✓" : "!", ok ? LIME : RED);
  setTimeout(() => void markSaved(tabId, before === "✓"), FLASH_MS);
}
