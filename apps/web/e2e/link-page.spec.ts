import { LIST_LIMIT_DEFAULT } from "@linkables/shared/links";
import type { Page } from "@playwright/test";
import { API_URL } from "./env";
import { expect, test } from "./fixtures";
import { openLinkPage } from "./open-link-page";
import { stubReader } from "./reader-stub";

const RUST = { url: "https://doc.rust-lang.org/rust-by-example/", resource: { title: "Rust by Example", fetchStatus: "fetched" as const } };
const TOKYO = { url: "https://www.youtube.com/watch?v=tokyo", resource: { title: "Tokyo night walk", kind: "video" as const, fetchStatus: "fetched" as const } };

function bar(page: Page) {
  return page.getByRole("banner").getByRole("group", { name: "Link actions" });
}

function linkRequest(page: Page, method: string) {
  return page.waitForResponse((response) => response.url().startsWith(`${API_URL}/api/v1/links/`) && response.request().method() === method);
}

// These pages have no article: the e2e API must not go out to the real sites for one.
test.beforeEach(async ({ page }) => {
  await stubReader(page, { status: "unavailable", url: RUST.url });
});

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("a row's Read opens the link's own page, and Back returns to the list where it was, on that row", async ({ page, seedLinks }) => {
    const filler = Array.from({ length: 24 }, (_, index) => ({ url: `https://example.com/filler-${String(index)}`, resource: { title: `Filler ${String(index)}`, kind: "video" as const, fetchStatus: "fetched" as const } }));
    const [rust] = await seedLinks([RUST, ...filler]);
    await page.goto("/");
    const row = page.getByRole("link", { name: /^Rust by Example/ });
    await row.scrollIntoViewIfNeeded();
    const scrolled = await page.evaluate(() => window.scrollY);
    expect(scrolled).toBeGreaterThan(0);

    await openLinkPage(page, row);
    await expect(page).toHaveURL(new RegExp(`/l/${rust?.id ?? ""}$`));
    await expect(page.getByRole("heading", { level: 1, name: /Rust by Example/ })).toBeFocused();

    await page.getByRole("banner").getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(row).toBeFocused();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrolled);
  });

  test("a row opens the saved URL in a new tab, and Read is a real link to the page", async ({ page, seedLinks }) => {
    const [rust] = await seedLinks([RUST]);
    await page.goto("/");
    const row = page.getByRole("link", { name: /^Rust by Example/ });
    await expect(row).toHaveAttribute("href", RUST.url);
    await expect(row).toHaveAttribute("target", "_blank");
    await row.hover();
    await expect(page.getByRole("link", { name: "Read", exact: true })).toHaveAttribute("href", `/l/${rust?.id ?? ""}`);
  });

  test("a video's row has no Read, but its page still opens from the address", async ({ page, seedLinks }) => {
    const [tokyo] = await seedLinks([TOKYO]);
    await page.goto("/");
    const row = page.getByRole("link", { name: /^Tokyo night walk/ });
    await row.hover();
    await expect(page.getByRole("link", { name: "Read", exact: true })).toHaveCount(0);
    await page.goto(`/l/${tokyo?.id ?? ""}`);
    await expect(page.getByRole("main").getByRole("link", { name: /^Watch on YouTube/ })).toHaveAttribute("href", TOKYO.url);
  });

  test("a row found by a search opens its page, and Back keeps the search", async ({ page, seedLinks }) => {
    await seedLinks([RUST, TOKYO]);
    await page.goto("/?q=rust");
    await expect(page.getByRole("link", { name: /^Tokyo night walk/ })).toHaveCount(0);
    await openLinkPage(page, page.getByRole("link", { name: /^Rust by Example/ }));
    await expect(page.getByRole("heading", { level: 1, name: /Rust by Example/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(/\/\?q=rust$/);
    await expect(page.getByRole("textbox", { name: "Search or paste a link" })).toHaveValue("rust");
    await expect(page.getByRole("link", { name: /^Rust by Example/ })).toBeFocused();
  });

  test("old addresses still open the link: ?link= on a list, and the reader's /read", async ({ page, seedLinks }) => {
    const [tokyo] = await seedLinks([TOKYO]);
    const id = tokyo?.id ?? "";
    await page.goto(`/?q=night&link=${id}`);
    await expect(page).toHaveURL(new RegExp(`/l/${id}$`));
    await expect(page.getByRole("heading", { level: 1, name: /Tokyo night walk/ })).toBeVisible();

    await page.goto(`/l/${id}/read`);
    await expect(page).toHaveURL(new RegExp(`/l/${id}$`));
    await expect(page.getByRole("heading", { level: 1, name: /Tokyo night walk/ })).toBeVisible();

    await page.goto("/l/not-a-link");
    await expect(page.getByText("Couldn't find this link")).toBeVisible();
  });

  test("a page opened directly goes Back to All links", async ({ page, seedLinks }) => {
    const [tokyo] = await seedLinks([TOKYO]);
    await page.goto(`/l/${tokyo?.id ?? ""}`);
    await page.getByRole("banner").getByRole("button", { name: "Back" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "All links" })).toBeVisible();
  });

  test("an address for a link past the first page opens its page", async ({ page, seedLinks }) => {
    const oldest = { url: "https://example.com/oldest", resource: { title: "The oldest link", fetchStatus: "fetched" as const } };
    const newer = Array.from({ length: LIST_LIMIT_DEFAULT }, (_, index) => ({ url: `https://example.com/newer-${String(index)}` }));
    const [target] = await seedLinks([oldest, ...newer]);
    await page.goto(`/l/${target?.id ?? ""}`);
    await expect(page.getByRole("heading", { level: 1, name: /The oldest link/ })).toBeVisible();
  });

  test("pinning from the bar pins the link", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    await openLinkPage(page, page.getByRole("link", { name: /^Rust by Example/ }));
    const pinned = linkRequest(page, "PATCH");
    await bar(page).getByRole("button", { name: "Pin" }).click();
    expect((await pinned).status()).toBe(200);
    await expect(bar(page).getByRole("button", { name: "Pin" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("banner").getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Pinned" })).toBeVisible();
  });

  test("a new title shows in the row, and clearing it brings back the fetched one", async ({ page, seedLinks }) => {
    const [rust] = await seedLinks([RUST]);
    await page.goto("/");
    await openLinkPage(page, page.getByRole("link", { name: /^Rust by Example/ }));
    await page.getByRole("button", { name: /Rust by Example/ }).click();
    const title = page.getByRole("textbox", { name: "Title" });
    await title.fill("Rust, the good parts");
    const renamed = linkRequest(page, "PATCH");
    await title.press("Enter");
    expect((await renamed).status()).toBe(200);
    await page.getByRole("banner").getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("link", { name: /^Rust, the good parts/ })).toBeVisible();

    await page.goto(`/l/${rust?.id ?? ""}`);
    await page.getByRole("button", { name: /Rust, the good parts/ }).click();
    await page.getByRole("textbox", { name: "Title" }).fill("");
    await page.getByRole("textbox", { name: "Title" }).press("Enter");
    await expect(page.getByRole("button", { name: /Rust by Example/ })).toBeVisible();
  });

  test("the note saves itself and is still there after a reload, and the bar's Note shows it", async ({ page, seedLinks }) => {
    const [tokyo] = await seedLinks([TOKYO]);
    await page.goto(`/l/${tokyo?.id ?? ""}`);
    await bar(page).getByRole("button", { name: "Note" }).click();
    const note = page.getByRole("textbox", { name: "Note" });
    await expect(note).toBeFocused();
    const saved = linkRequest(page, "PATCH");
    await note.fill("Chapter 4 on ownership");
    expect((await saved).status()).toBe(200);
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("textbox", { name: "Note" })).toHaveValue("Chapter 4 on ownership");
    await expect(bar(page).getByRole("button", { name: "Note (has a note)" })).toBeVisible();
  });

  // The first save to a link warms the browser's CORS preflight for it; a keepalive
  // request that still needs a preflight is dropped as the page unloads.
  test("a note typed just before a reload is kept", async ({ page, seedLinks }) => {
    const [tokyo] = await seedLinks([TOKYO]);
    await page.goto(`/l/${tokyo?.id ?? ""}`);
    const note = page.getByRole("textbox", { name: "Note" });
    await note.fill("first thought");
    await expect(page.getByText("Saved", { exact: true })).toBeVisible();
    await note.fill("first thought, then reloaded");
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Note" })).toHaveValue("first thought, then reloaded");
  });

  test("Undo restores row focus after the toast returns focus to the heading", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    const row = page.getByRole("link", { name: /^Rust by Example/ });
    await openLinkPage(page, row);
    await bar(page).getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "All links" })).toBeFocused();
    await page.evaluate(() => {
      // Sonner can restore its previous focus while the restored row takes focus.
      const restoreToastFocus = (event: FocusEvent) => {
        if (!(event.target instanceof HTMLElement) || !event.target.matches("[data-row-link]")) return;
        document.removeEventListener("focusin", restoreToastFocus);
        document.querySelector<HTMLElement>("main h1")?.focus();
      };
      document.addEventListener("focusin", restoreToastFocus);
    });
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(row).toBeFocused();
  });

  test("delete offers Undo and goes back, and deletes for real once the toast closes", async ({ page, seedLinks }) => {
    await seedLinks([RUST]);
    await page.goto("/");
    const row = page.getByRole("link", { name: /^Rust by Example/ });

    await openLinkPage(page, row);
    await bar(page).getByRole("button", { name: "Delete" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(row).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1, name: "All links" })).toBeFocused();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(row).toBeVisible();
    await expect(row).toBeFocused();

    await openLinkPage(page, row);
    const deleted = page.waitForResponse(
      (response) => response.url().startsWith(`${API_URL}/api/v1/links/`) && response.request().method() === "DELETE",
      { timeout: 10_000 },
    );
    await bar(page).getByRole("button", { name: "Delete" }).click();
    await page.mouse.move(640, 400);
    expect((await deleted).status()).toBe(200);
    await page.reload();
    await expect(page.getByRole("heading", { name: /Save your first link/ })).toBeVisible();
  });
});

test.describe("at 360 px", () => {
  test.use({ viewport: { width: 360, height: 780 }, hasTouch: true });

  test("the page fits without scrolling sideways, with Share and Open original on the bar and the rest under More", async ({ page, seedLinks }) => {
    await seedLinks([{ ...RUST, resource: { ...RUST.resource, title: `Rust ${"by example ".repeat(30)}` } }]);
    await page.goto("/");
    await openLinkPage(page, page.getByRole("link", { name: /^Rust by example/ }));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBe(0);

    const tappable = [
      page.getByRole("banner").getByRole("button", { name: "Back" }),
      bar(page).getByRole("button", { name: "Share" }),
      bar(page).getByRole("link", { name: /^Open original/ }),
      bar(page).getByRole("button", { name: "More actions" }),
    ];
    for (const target of tappable) {
      const box = await target.boundingBox();
      expect(Math.round(box?.height ?? 0)).toBeGreaterThanOrEqual(44);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360);
    }

    await bar(page).getByRole("button", { name: "More actions" }).click();
    const menu = page.getByRole("menu");
    await expect(menu.getByRole("menuitem")).toHaveText(["Pin", "Add to…", "Note", "Delete"]);
    await menu.getByRole("menuitem", { name: "Pin" }).click();
    await bar(page).getByRole("button", { name: "More actions" }).click();
    await expect(menu.getByRole("menuitem", { name: "Unpin" })).toBeVisible();
  });

  test("Add to from More opens the Add to sheet, which keeps focus inside and hands it back", async ({ page, seedLinks }) => {
    const [tokyo] = await seedLinks([TOKYO]);
    await page.goto(`/l/${tokyo?.id ?? ""}`);
    const more = bar(page).getByRole("button", { name: "More actions" });
    await more.click();
    await page.getByRole("menuitem", { name: "Add to…" }).click();
    const sheet = page.getByRole("dialog", { name: /Tokyo night walk/ });
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => document.activeElement?.closest("[role=dialog]") !== null)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(sheet).toHaveCount(0);
    await expect(page).toHaveURL(new RegExp(`/l/${tokyo?.id ?? ""}$`));
  });
});
