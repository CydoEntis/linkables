import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { BUILT_URL } from "./built-env";
import { SUPABASE_URL } from "./env";
import { createTestUser, signedInState } from "./session";

// Nothing behind this build answers for Supabase or the API; the app only has to start.
test.beforeEach(async ({ context }) => {
  await context.route(`${SUPABASE_URL}/**`, (route) => route.abort());
});

async function expectAppBooted(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-app-boot", "");
  await expect(page.locator("#landing")).toBeHidden();
  await expect(page.locator("#root > *").first()).toBeAttached();
}

test("a signed-out visitor gets the prerendered landing page without the app", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (request) => { if (request.resourceType() === "script") scripts.push(request.url()); });
  const response = await page.goto("/");
  expect(await response?.text()).toContain("Never lose a");
  await expect(page.getByRole("heading", { name: "Never lose a link again.", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Request access" }).first()).toHaveAttribute("href", "/request-access");
  expect(scripts).toEqual([]);
});

test("a stored session loads the app instead of the landing page", async ({ browser }) => {
  const context = await browser.newContext({ storageState: signedInState(await createTestUser(), BUILT_URL) });
  await context.route(`${SUPABASE_URL}/**`, (route) => route.abort());
  const page = await context.newPage();
  await page.goto("/");
  await expectAppBooted(page);
  await context.close();
});

test("an email sign-in link's tokens load the app", async ({ page }) => {
  await page.goto("/#access_token=token&refresh_token=refresh&expires_in=3600&token_type=bearer&type=magiclink");
  await expectAppBooted(page);
});

test("an expired email sign-in link loads the app, which explains the problem", async ({ page }) => {
  await page.goto("/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  await expectAppBooted(page);
  await expect(page.getByRole("heading", { name: "This link has expired" })).toBeVisible();
});

test("the request access form loads the app for a visitor who is not signed in", async ({ page }) => {
  await page.goto("/request-access");
  await expect(page.getByRole("heading", { name: "Request access", level: 1 })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("the extension install guide is open to a visitor who is not signed in", async ({ page }) => {
  await page.goto("/extension");
  await expect(page.getByRole("heading", { name: "linkables for Chrome" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download for Chrome" })).toHaveAttribute("href", "/downloads/linkables-chrome.zip");
});

test.describe("the extension download", () => {
  // CI copies the real zip here after the web build; the test stands in a tiny one.
  const downloads = fileURLToPath(new URL("../dist/downloads/", import.meta.url));
  const emptyZip = Buffer.from([0x50, 0x4b, 0x05, 0x06, ...new Array<number>(18).fill(0)]);

  test.beforeAll(() => {
    mkdirSync(downloads, { recursive: true });
    writeFileSync(`${downloads}linkables-chrome.zip`, emptyZip);
  });
  test.afterAll(() => { rmSync(downloads, { recursive: true, force: true }); });

  test("is served as the zip file, not the app shell", async ({ request }) => {
    const response = await request.get("/downloads/linkables-chrome.zip");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("application/zip");
    expect(await response.body()).toEqual(emptyZip);
  });
});

test.describe("prerendered pages", () => {
  for (const [path, title] of [
    ["/privacy", "Privacy policy · linkables"],
    ["/terms", "Terms of use · linkables"],
    ["/support", "Support · linkables"],
  ] as const) {
    test(`${path} is served as HTML with its own title and preview tags`, async ({ request }) => {
      const html = await (await request.get(path)).text();
      expect(html).toContain(`<title>${title}</title>`);
      expect(html).toContain(`<link rel="canonical" href="https://linkables.app${path}">`);
      expect(html).toContain(`<meta property="og:image" content="https://linkables.app/social/linkables.png">`);
    });
  }

  test("robots.txt and sitemap.xml are served", async ({ request }) => {
    expect(await (await request.get("/robots.txt")).text()).toContain("Sitemap: https://linkables.app/sitemap.xml");
    expect(await (await request.get("/sitemap.xml")).text()).toContain("<loc>https://linkables.app/privacy</loc>");
  });

  test("app paths still get the app shell, kept out of search", async ({ request }) => {
    const html = await (await request.get("/sign-in")).text();
    expect(html).toContain(`<meta name="robots" content="noindex"`);
    expect(html).toContain(`<div id="root">`);
  });

  test("a shared collection's deep link gets the app shell with its link preview, kept out of search and Referer headers", async ({ request }) => {
    const response = await request.get(`/s/${"A".repeat(32)}`);

    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<div id="root">`);
    expect(html).toContain(`<meta property="og:image" content="https://linkables.app/social/shared-collection.png">`);
    expect(html).toContain(`<meta property="og:title" content="A shared collection on linkables">`);
    expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  });
});
