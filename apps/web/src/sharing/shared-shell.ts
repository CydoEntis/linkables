import { SITE_ORIGIN } from "../marketing/pages";

export const SHARED_SHELL_FILE = "shared.html";
const IMAGE = `${SITE_ORIGIN}/social/shared-collection.png`;
const TITLE = "A shared collection on linkables";
const DESCRIPTION = "Links worth keeping. Save it once. Find it anywhere.";

// Chat apps read these tags without running the app, so every /s/ address gets
// the same generic preview. No og:url: the address holds the share token.
const PREVIEW_TAGS = [
  `<meta property="og:type" content="website">`,
  `<meta property="og:site_name" content="linkables">`,
  `<meta property="og:title" content="${TITLE}">`,
  `<meta property="og:description" content="${DESCRIPTION}">`,
  `<meta property="og:image" content="${IMAGE}">`,
  `<meta property="og:image:width" content="1200">`,
  `<meta property="og:image:height" content="630">`,
  `<meta property="og:image:alt" content="linkables: ${DESCRIPTION}">`,
  `<meta name="twitter:card" content="summary_large_image">`,
  `<meta name="twitter:title" content="${TITLE}">`,
  `<meta name="twitter:description" content="${DESCRIPTION}">`,
  `<meta name="twitter:image" content="${IMAGE}">`,
];

// The built app shell (dist/index.html) as Caddy serves it for /s/*.
export function sharedShellHtml(indexHtml: string): string {
  const html = indexHtml
    .replace(/<meta name="robots" content="noindex"/, `<meta name="robots" content="noindex, nofollow"`)
    .replace("</head>", `${PREVIEW_TAGS.join("\n")}\n</head>`);
  if (!html.includes("og:image") || !html.includes("noindex, nofollow")) throw new Error("dist/index.html has no </head> or robots tag to build the shared shell from");
  return html;
}
