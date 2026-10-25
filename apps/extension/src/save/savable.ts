import { URL_MAX_LENGTH } from "@linkables/shared/links";

export const CANT_SAVE_REASONS = {
  browser: "Browser pages like Settings don't have a web address.",
  file: "Files on your computer can't be saved, only pages on the web.",
  webStore: "Chrome doesn't let extensions use Chrome Web Store pages.",
  noAddress: "This page doesn't have a web address to save.",
  unreadable: "linkables couldn't read this page's address. Reload the page and try again.",
  tooLong: "This page's address is too long to save.",
} as const;

export type SavablePage = { ok: true; url: string; title: string | null } | { ok: false; reason: string };

type TabLike = { url?: string | undefined; title?: string | undefined };

const BROWSER_SCHEMES = new Set(["chrome:", "edge:", "brave:", "opera:", "vivaldi:", "about:", "chrome-extension:", "view-source:", "devtools:"]);

function isWebStore(url: URL): boolean {
  return url.hostname === "chromewebstore.google.com" || (url.hostname === "chrome.google.com" && url.pathname.startsWith("/webstore"));
}

function cantSaveReason(url: URL, raw: string): string | null {
  if (BROWSER_SCHEMES.has(url.protocol)) return CANT_SAVE_REASONS.browser;
  if (url.protocol === "file:") return CANT_SAVE_REASONS.file;
  if (url.protocol !== "http:" && url.protocol !== "https:") return CANT_SAVE_REASONS.noAddress;
  if (isWebStore(url)) return CANT_SAVE_REASONS.webStore;
  if (raw.length > URL_MAX_LENGTH) return CANT_SAVE_REASONS.tooLong;
  return null;
}

export function savablePage(tab: TabLike): SavablePage {
  if (!tab.url || !URL.canParse(tab.url)) return { ok: false, reason: CANT_SAVE_REASONS.unreadable };
  const reason = cantSaveReason(new URL(tab.url), tab.url);
  if (reason) return { ok: false, reason };
  return { ok: true, url: tab.url, title: tab.title || null };
}
