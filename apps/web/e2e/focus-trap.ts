import { expect, type Page } from "@playwright/test";

async function watchFocusEscapes(page: Page) {
  await page.evaluate(() => {
    const escapes: string[] = [];
    (window as unknown as { focusEscapes: string[] }).focusEscapes = escapes;
    document.addEventListener("focusin", (event) => {
      const target = event.target as Element;
      if (target.closest("[role=dialog]") === null) escapes.push(target.outerHTML.slice(0, 120));
    });
  });
}

async function expectTabStaysInside(page: Page, key: "Tab" | "Shift+Tab") {
  for (let i = 0; i < 20; i++) await page.keyboard.press(key);
  expect(await page.evaluate(() => (window as unknown as { focusEscapes: string[] }).focusEscapes)).toEqual([]);
  expect(await page.evaluate(() => document.activeElement?.closest("[role=dialog]") !== null)).toBe(true);
}

// 20 fast Tabs, then 20 Shift+Tabs, never focus anything outside the open
// dialog, not even for the one frame before a focus guard pulls it back.
export async function expectFocusTrapped(page: Page) {
  await watchFocusEscapes(page);
  await expectTabStaysInside(page, "Tab");
  await expectTabStaysInside(page, "Shift+Tab");
}
