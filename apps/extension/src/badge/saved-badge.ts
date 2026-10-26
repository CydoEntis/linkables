// A toolbar button is only an icon and a badge of up to 4 characters, so the
// handoff's lime "✓ Saved" pill becomes a lime ✓ badge on the tab's button.
// The badge is set per tab, and Chrome clears it when the tab loads a new document.
// A same-document navigation (a single-page site's pushState) keeps it: while the
// side panel is open and can read the tab (Follow the tab you're on, or a tab
// linkables was used on), it re-checks on the address change and corrects the
// mark; otherwise the ✓ can stay on such a page until the tab loads another one.

// --primary, oklch(0.89 0.19 125), and --primary-foreground in hex: the badge takes no oklch.
const LIME = "#bef050";
const INK = "#16200a";
// --destructive, oklch(0.72 0.16 25).
const RED = "#f97770";

const FLASH_MS = 2000;
// Long enough to hover the button and read why.
const FAILED_FLASH_MS = 6000;

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
// a red !, with the hint as the button's tooltip, then the tab's own mark and title again.
export async function flashSaveResult(tabId: number, ok: boolean, hint: string): Promise<void> {
  const own = await ownMark(tabId);
  const pending = flashes.get(tabId);
  if (pending) clearTimeout(pending.timer);
  const timer = setTimeout(() => {
    flashes.delete(tabId);
    void markSaved(tabId, own.badge === "✓");
    void chrome.action.setTitle({ tabId, title: own.title });
  }, ok ? FLASH_MS : FAILED_FLASH_MS);
  flashes.set(tabId, { ...own, timer });
  await Promise.all([setBadge(tabId, ok ? "✓" : "!", ok ? LIME : RED), chrome.action.setTitle({ tabId, title: hint })]);
}

type OwnMark = { badge: string; title: string };

// A tab's badge and title before any flash, kept while a flash is showing so a
// second one restores the tab's own, not the first flash's.
const flashes = new Map<number, OwnMark & { timer: ReturnType<typeof setTimeout> }>();

async function ownMark(tabId: number): Promise<OwnMark> {
  const pending = flashes.get(tabId);
  if (pending) return { badge: pending.badge, title: pending.title };
  const [badge, title] = await Promise.all([chrome.action.getBadgeText({ tabId }), chrome.action.getTitle({ tabId })]);
  return { badge, title };
}
