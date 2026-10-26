// A toolbar button is only an icon and a badge of up to 4 characters, so the
// handoff's lime "✓ Saved" pill becomes a lime ✓ badge on the tab's button.
// The badge is set per tab, and Chrome clears a tab's badge when it navigates,
// so a mark never outlives the page it was set for.

// --primary, oklch(0.89 0.19 125), and --primary-foreground in hex: the badge takes no oklch.
const LIME = "#bef050";
const INK = "#16200a";

export async function markSaved(tabId: number, saved: boolean): Promise<void> {
  if (!saved) {
    await chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }
  await Promise.all([
    chrome.action.setBadgeBackgroundColor({ tabId, color: LIME }),
    chrome.action.setBadgeTextColor({ tabId, color: INK }),
    chrome.action.setBadgeText({ tabId, text: "✓" }),
  ]);
}
