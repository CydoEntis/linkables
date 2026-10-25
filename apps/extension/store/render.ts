// Draws the Chrome Web Store images into store/ (see STORE.md): the store icon,
// the promo tile and screenshots of the real pop-up, built from this source and
// fed canned API answers. Run with `pnpm --filter extension store:images`.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ListedCollection } from "@linkables/shared/collections";
import type { SaveLinkResponse } from "@linkables/shared/links";
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { build } from "vite";
import { EXTENSION_ID } from "../manifest.ts";

const storeDir = import.meta.dirname;
const buildDir = join(storeDir, "dist");
const APP_URL = "http://app.test";
const SUPABASE_URL = "http://dummy.test";
// A page on an origin the build may read, standing in for the article in the screenshots.
const ARTICLE_URL = `${APP_URL}/article`;
const ARTICLE_TITLE = "Tonkotsu ramen at home, step by step";

async function buildPopup() {
  Object.assign(process.env, { VITE_APP_URL: APP_URL, VITE_SUPABASE_URL: SUPABASE_URL, VITE_SUPABASE_ANON_KEY: "store-images" });
  await build({ root: join(storeDir, ".."), mode: "store-images", logLevel: "warn", build: { outDir: buildDir, emptyOutDir: true } });
}

const at = (day: number) => new Date(Date.UTC(2026, 9, day, 12)).toISOString();

const collectionId = (n: number) => `00000000-0000-4000-8000-00000000000${String(n)}`;

// Most recently used first, as the pop-up lists them.
const COLLECTIONS: ListedCollection[] = ["Trip to Japan", "Recipes", "Weekend reads", "Watch later", "Home office"].map((name, i) => ({
  id: collectionId(i + 1),
  name,
  pinned: false,
  createdAt: at(1),
  lastUsedAt: at(23 - i),
  linkCount: 4,
  cover: [],
}));

const FILED_IN = { id: collectionId(1), name: "Trip to Japan" };

function savedLink(overrides: Partial<SaveLinkResponse>): SaveLinkResponse {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    originalUrl: ARTICLE_URL,
    titleOverride: null,
    note: null,
    pinned: false,
    savedAt: at(24),
    savedFrom: "extension",
    collections: [],
    duplicate: false,
    resource: {
      id: "20000000-0000-4000-8000-000000000001",
      canonicalUrl: ARTICLE_URL,
      title: ARTICLE_TITLE,
      description: null,
      author: null,
      faviconUrl: null,
      thumbnailUrl: null,
      kind: "page",
      fetchStatus: "fetched",
    },
    ...overrides,
  };
}

const envelope = (data: unknown) => ({ ok: true, data, meta: { requestId: crypto.randomUUID(), ms: 1, version: "v1" } });

async function answerApi(context: BrowserContext, link: SaveLinkResponse) {
  await context.unrouteAll();
  await context.route(`${SUPABASE_URL}/**`, (route) => route.abort());
  await context.route(ARTICLE_URL, (route) => route.fulfill({ contentType: "text/html", body: `<!doctype html><title>${ARTICLE_TITLE}</title>` }));
  await context.route(`${APP_URL}/api/v1/links`, (route) => route.fulfill({ json: envelope(link) }));
  await context.route(`${APP_URL}/api/v1/collections`, (route) => route.fulfill({ json: envelope({ items: COLLECTIONS }) }));
}

// Unsigned: only the pop-up reads it here, and every API call is answered above.
function fakeSession(): string {
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const user = { id: "30000000-0000-4000-8000-000000000001", email: "alex@example.com", aud: "authenticated", role: "authenticated" };
  return JSON.stringify({
    access_token: `${part({ alg: "none" })}.${part({ sub: user.id, exp })}.x`,
    refresh_token: "store-images",
    token_type: "bearer",
    expires_in: 86400,
    expires_at: exp,
    user: { ...user, app_metadata: {}, user_metadata: {}, created_at: at(1) },
  });
}

// The pop-up saves the active tab as it opens, so the article goes in front before each reload.
async function popupShot(popup: Page, article: Page, heading: string): Promise<Buffer> {
  await article.bringToFront();
  await popup.reload();
  await popup.getByRole("heading", { name: heading, exact: true }).waitFor();
  await popup.getByRole("button", { name: "Trip to Japan" }).waitFor();
  return popup.locator("#root").screenshot({ animations: "disabled" });
}

type Shot = { file: string; caption: string; detail: string; popup: Buffer };

async function renderShot(page: Page, shot: Shot) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { document.body.dataset.view = "shot"; });
  await page.locator("[data-caption]").evaluate((element, html) => { element.innerHTML = html; }, shot.caption);
  await page.locator("[data-detail]").evaluate((element, text) => { element.textContent = text; }, shot.detail);
  const popup = `data:image/png;base64,${shot.popup.toString("base64")}`;
  await page.locator("[data-popup]").evaluate((img: HTMLImageElement, src) => { img.src = src; return img.decode(); }, popup);
  await page.locator("#shot").screenshot({ path: join(storeDir, shot.file) });
}

async function renderPlain(page: Page, view: "promo" | "icon", file: string) {
  await page.evaluate((name) => { document.body.dataset.view = name; }, view);
  await page.locator(`#${view}`).screenshot({ path: join(storeDir, file), omitBackground: view === "icon" });
}

async function capturePopups(): Promise<Shot[]> {
  const context = await chromium.launchPersistentContext("", {
    channel: "chromium",
    deviceScaleFactor: 2,
    viewport: { width: 344, height: 640 },
    args: [`--disable-extensions-except=${buildDir}`, `--load-extension=${buildDir}`],
  });
  try {
    await answerApi(context, savedLink({}));
    const article = await context.newPage();
    await article.goto(ARTICLE_URL);
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);
    await popup.evaluate((session) => chrome.storage.local.set({ "sb-dummy-auth-token": session }), fakeSession());
    const saved = await popupShot(popup, article, "Saved");

    await answerApi(context, savedLink({ duplicate: true, pinned: true, collections: [FILED_IN] }));
    const pinned = await popupShot(popup, article, "Already saved");

    return [
      { file: "screenshot-1-saved.png", caption: "One click saves <em>the page you're on.</em>", detail: "Click linkables in the toolbar and the page is in your account, ready on every device.", popup: saved },
      { file: "screenshot-2-collections.png", caption: "Pin it, or file it in <em>a collection.</em>", detail: "Right from the pop-up, or later on linkables.app. Saved twice? It tells you.", popup: pinned },
    ];
  } finally {
    await context.close();
  }
}

async function main() {
  await buildPopup();
  const shots = await capturePopups();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(pathToFileURL(join(storeDir, "template.html")).href);
    await page.evaluate(() => document.fonts.ready);
    for (const shot of shots) await renderShot(page, shot);
    await renderPlain(page, "promo", "promo-small-440x280.png");
    await renderPlain(page, "icon", "icon-128.png");
  } finally {
    await browser.close();
  }
  console.log("Wrote the store images to store/");
}

await main();
