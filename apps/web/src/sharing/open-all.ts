import { safeHref } from "../links/link-display";

// The links as given, so the page can tick the opened ones and retry the rest.
export type OpenAllResult = { opened: string[]; blocked: string[] };

// Browsers usually let one click open a single pop-up, so the rest may be
// blocked; window.open returns null for each one that was. "noopener" would make
// it return null every time, so the tab opens blank, still on this origin, and
// its opener is cut before it goes to the link.
export function openAll(urls: readonly string[], open: typeof window.open = window.open.bind(window)): OpenAllResult {
  const opened: string[] = [];
  const blocked: string[] = [];
  for (const url of urls) {
    const href = safeHref(url);
    if (href === undefined) continue;
    const tab = open("", "_blank");
    if (tab === null) {
      blocked.push(url);
      continue;
    }
    tab.opener = null;
    tab.location.href = href;
    opened.push(url);
  }
  return { opened, blocked };
}
