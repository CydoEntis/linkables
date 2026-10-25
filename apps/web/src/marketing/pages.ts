export const SITE_ORIGIN = "https://linkables.app";
export const SOCIAL_IMAGE_PATH = "/social/linkables.png";
export { SUPPORT_EMAIL } from "../config/access";

export type MarketingPage = { path: string; file: string; title: string; description: string };

export const LANDING_PAGE = {
  path: "/",
  file: "landing.html",
  title: "linkables: save links, find them later on any device",
  description:
    "Save any link from your phone or browser in one tap, then find it on any device with search, collections and pins. Free, with no ads and no tracking.",
} as const satisfies MarketingPage;

export const PRIVACY_PAGE = {
  path: "/privacy",
  file: "privacy.html",
  title: "Privacy policy · linkables",
  description: "What linkables stores, why, and what it never does: no ads, no tracking, no selling your data. Export your links any time.",
} as const satisfies MarketingPage;

export const TERMS_PAGE = {
  path: "/terms",
  file: "terms.html",
  title: "Terms of use · linkables",
  description: "The rules for using linkables, the free app for saving links and finding them later on any device.",
} as const satisfies MarketingPage;

export const SUPPORT_PAGE = {
  path: "/support",
  file: "support.html",
  title: "Support · linkables",
  description: "Get help with linkables: contact support, export your links, delete your account, and save from iPhone or Android.",
} as const satisfies MarketingPage;

const PUBLIC_PATHS: ReadonlySet<string> = new Set([PRIVACY_PAGE.path, TERMS_PAGE.path, SUPPORT_PAGE.path]);

// Pages anyone can read, signed in or not, without waiting for the session.
export function isPublicPage(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname);
}
