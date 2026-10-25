import { safeHref } from "../links/link-display";

export type OpenAllResult = { opened: number; blocked: number };

// Browsers usually let one click open a single pop-up, so the rest may be
// blocked; window.open returns null for each one that was. "noopener" would make
// it return null every time, so the tab opens blank, still on this origin, and
// its opener is cut before it goes to the link.
export function openAll(urls: readonly string[], open: typeof window.open = window.open.bind(window)): OpenAllResult {
  let opened = 0;
  let blocked = 0;
  for (const url of urls) {
    const href = safeHref(url);
    if (href === undefined) continue;
    const tab = open("", "_blank");
    if (tab === null) {
      blocked += 1;
      continue;
    }
    tab.opener = null;
    tab.location.href = href;
    opened += 1;
  }
  return { opened, blocked };
}
