import type { BrowserContext, Page } from "@playwright/test";
import { testTokenHash } from "../../api/src/extension-sessions/supabase-admin";
import { APP_URL } from "./env";
import { expect, test } from "./fixtures";

const CONNECT_URL = `${APP_URL}/extension/connect`;
// On the app origin, so the content script runs there, but not the web app: the test plays its part.
const BLANK_URL = `${APP_URL}/e2e/blank`;
// Long enough for the content script and worker to answer a ping, which takes milliseconds.
const NO_ANSWER_MS = 1500;

// Signed in, the pop-up saves whichever tab is in front, so its footer is the steady sign.
const signedIn = (popup: Page) => popup.getByRole("button", { name: "Sign out" });
const signInHeading = (popup: Page) => popup.getByRole("heading", { name: "Sign in to save this page" });

async function visitApp(context: BrowserContext): Promise<Page> {
  const app = await context.newPage();
  await app.goto(`${APP_URL}/`);
  return app;
}

async function openBlankAppPage(context: BrowserContext): Promise<Page> {
  await context.route(BLANK_URL, (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>blank</title>" }));
  const page = await context.newPage();
  await page.goto(BLANK_URL);
  // Every connected message the extension posts, in order.
  await page.evaluate(() => {
    const seen: unknown[] = [];
    Object.assign(window, { connected: seen });
    window.addEventListener("message", (event: MessageEvent<{ type?: string }>) => {
      if (event.data.type === "linkables:extension-connected") seen.push(event.data);
    });
  });
  return page;
}

// Pings as the web app does, and resolves with the nonce of the hello, or null if none comes.
function ping(page: Page): Promise<string | null> {
  return page.evaluate(
    (waitMs) =>
      new Promise<string | null>((resolve) => {
        setTimeout(() => { resolve(null); }, waitMs);
        window.addEventListener("message", (event: MessageEvent<{ type?: string; nonce?: string }>) => {
          if (event.data.type === "linkables:extension-hello") resolve(event.data.nonce ?? null);
        });
        window.postMessage({ type: "linkables:extension-ping" }, window.location.origin);
      }),
    NO_ANSWER_MS,
  );
}

function postSession(page: Page, nonce: string, tokenHash: string) {
  return page.evaluate(
    ({ nonce, tokenHash }) => { window.postMessage({ type: "linkables:extension-session", nonce, tokenHash }, window.location.origin); },
    { nonce, tokenHash },
  );
}

test("signed in on linkables.app, a visit signs the extension in with no typing", async ({ context, openPopup, signInOnWeb, supabaseLog, user }) => {
  await signInOnWeb();
  const popup = await openPopup();
  await expect(signInHeading(popup)).toBeVisible();

  await visitApp(context);

  // The open pop-up notices the session the worker wrote, and says whose it is.
  await expect(signedIn(popup)).toBeVisible();
  await expect(popup.getByText(`Signed in as ${user.email}`)).toBeVisible();
  expect(supabaseLog.verifiedTokenHashes).toEqual([testTokenHash(user.id)]);
});

test("Sign in with linkables.app opens the connect page, which signs in and closes", async ({ context, openPopup, signInOnWeb }) => {
  const popup = await openPopup();
  await signInOnWeb();
  const tab = context.waitForEvent("page");

  await popup.getByRole("button", { name: "Sign in with linkables.app" }).click();

  const connectPage = await tab;
  await connectPage.waitForURL(CONNECT_URL, { waitUntil: "commit" });
  await expect.poll(() => connectPage.isClosed()).toBe(true);
  await expect(signedIn(popup)).toBeVisible();
});

test("a session sent with the wrong nonce is ignored", async ({ context, openPopup, supabaseLog, user }) => {
  const page = await openBlankAppPage(context);
  const nonce = await ping(page);
  if (nonce === null) throw new Error("the extension sent no hello");

  await postSession(page, "f".repeat(32), "token-for-someone-else");
  await postSession(page, nonce, testTokenHash(user.id));

  await expect.poll(() => page.evaluate(() => (window as unknown as { connected: unknown[] }).connected)).toEqual([
    { type: "linkables:extension-connected", ok: true },
  ]);
  expect(supabaseLog.verifiedTokenHashes).toEqual([testTokenHash(user.id)]);
  await expect(signedIn(await openPopup())).toBeVisible();
});

test("after Sign out in the extension, a visit to linkables.app does not sign it back in", async ({ context, openPopup, signInOnWeb, supabaseLog }) => {
  await signInOnWeb();
  const app = await visitApp(context);
  const popup = await openPopup();
  await expect(signedIn(popup)).toBeVisible();

  await popup.getByRole("button", { name: "Sign out" }).click();
  await expect(signInHeading(popup)).toBeVisible();
  await app.reload();
  await expect(app.getByRole("heading", { name: "All links", level: 1 })).toBeVisible();

  expect(await ping(app)).toBeNull();
  await expect(signInHeading(popup)).toBeVisible();
  expect(supabaseLog.verifiedTokenHashes).toHaveLength(1);

  // The button still signs in, and visits sign in by themselves again.
  await popup.getByRole("button", { name: "Sign in with linkables.app" }).click();
  await expect(signedIn(popup)).toBeVisible();
  expect(supabaseLog.verifiedTokenHashes).toHaveLength(2);
});
