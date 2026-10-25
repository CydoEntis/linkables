// Renders the committed brand PNGs from their sources. Run by hand after
// changing public/favicon.svg or social-image.html:
//   pnpm --filter web exec node src/marketing/brand/render-brand-assets.ts
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const at = (path: string) => new URL(path, import.meta.url);
const pathOf = (path: string) => fileURLToPath(at(path));

mkdirSync(pathOf("../../../public/social/"), { recursive: true });
const browser = await chromium.launch();
try {
  const social = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await social.goto(at("social-image.html").href);
  await social.evaluate(() => document.fonts.ready);
  await social.screenshot({ path: pathOf("../../../public/social/linkables.png") });

  // An SVG without width or height fills the viewport, so this draws it at 32 px.
  const favicon = await browser.newPage({ viewport: { width: 32, height: 32 } });
  await favicon.goto(at("../../../public/favicon.svg").href);
  await favicon.screenshot({ path: pathOf("../../../public/favicon-32.png"), omitBackground: true });
} finally {
  await browser.close();
}
