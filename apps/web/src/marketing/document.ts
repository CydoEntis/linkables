import { bootScript } from "./boot-app";
import { type MarketingPage, SITE_ORIGIN, SOCIAL_IMAGE_PATH } from "./pages";

export type BuiltAssets = { stylesheets: string[]; entry: string };

export type DocumentOptions = {
  page: MarketingPage;
  body: string;
  assets: BuiltAssets;
  indexable: boolean;
  // The landing page loads the app in place when a session is stored (boot-app.ts).
  bootsApp: boolean;
};

// The phone menu is a <details>; a link inside it jumps within the page, so close it.
const CLOSE_MENU_SCRIPT = `document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("[data-lp-menu] a");if(a)a.closest("details").open=false})`;

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function pageUrl(page: MarketingPage): string {
  return SITE_ORIGIN + page.path;
}

function metaTags(page: MarketingPage, indexable: boolean): string[] {
  const title = escapeAttr(page.title);
  const description = escapeAttr(page.description);
  const image = SITE_ORIGIN + SOCIAL_IMAGE_PATH;
  const shared = [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="linkables">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="linkables: Never lose a link again.">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${image}">`,
  ];
  if (!indexable) return [`<meta name="robots" content="noindex">`, ...shared];
  const url = pageUrl(page);
  return [`<link rel="canonical" href="${url}">`, `<meta property="og:url" content="${url}">`, ...shared];
}

export function marketingDocument({ page, body, assets, indexable, bootsApp }: DocumentOptions): string {
  const head = [
    `<meta charset="UTF-8">`,
    `<meta name="viewport" content="width=device-width, initial-scale=1.0">`,
    `<title>${escapeAttr(page.title)}</title>`,
    `<meta name="description" content="${escapeAttr(page.description)}">`,
    ...metaTags(page, indexable),
    `<meta name="theme-color" content="#121212">`,
    `<link rel="icon" href="/favicon.svg" type="image/svg+xml">`,
    `<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">`,
    `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">`,
    `<link rel="manifest" href="/manifest.webmanifest">`,
    ...assets.stylesheets.map((href) => `<link rel="stylesheet" crossorigin href="${escapeAttr(href)}">`),
    ...(bootsApp ? [`<script>${bootScript(assets.entry)}</script>`] : []),
  ];
  const root = bootsApp ? `<div id="root"></div>` : "";
  return `<!doctype html>\n<html lang="en" class="dark">\n<head>\n${head.join("\n")}\n</head>\n<body>\n<div id="landing">${body}</div>${root}\n<script>${CLOSE_MENU_SCRIPT}</script>\n</body>\n</html>\n`;
}

export function sitemapXml(pages: MarketingPage[]): string {
  const urls = pages.map((page) => `  <url><loc>${pageUrl(page)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
