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

async function expectTabStaysInside(page: Page, key: "Tab" | "Shift+Tab", minStops: number) {
  await page.evaluate(() => {
    const focused = new Set<Element>();
    (window as unknown as { focused: Set<Element> }).focused = focused;
    document.addEventListener("focusin", (event) => { focused.add(event.target as Element); });
  });
  for (let i = 0; i < 20; i++) await page.keyboard.press(key);
  // A handler that cancelled every Tab would also keep focus inside.
  expect(await page.evaluate(() => (window as unknown as { focused: Set<Element> }).focused.size)).toBeGreaterThanOrEqual(minStops);
  expect(await page.evaluate(() => (window as unknown as { focusEscapes: string[] }).focusEscapes)).toEqual([]);
  expect(await page.evaluate(() => document.activeElement?.closest("[role=dialog]") !== null)).toBe(true);
}

// 20 fast Tabs, then 20 Shift+Tabs, never focus anything outside the open
// dialog, not even for the one frame before a focus guard pulls it back.
// A dialog with a single Tab stop passes minStops 0: Tab stays on that stop.
export async function expectFocusTrapped(page: Page, minStops = 2) {
  await watchFocusEscapes(page);
  await expectTabStaysInside(page, "Tab", minStops);
  await expectTabStaysInside(page, "Shift+Tab", minStops);
}
