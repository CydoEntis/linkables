import type { Locator, Page } from "@playwright/test";

// A row opens the saved URL; the link's own page is behind its Read action,
// shown on hover on a big screen and as the first swipe tile on a phone.
export async function openLinkPage(page: Page, row: Locator): Promise<void> {
  const read = row.locator("..").getByRole("link", { name: "Read", exact: true });
  if ((page.viewportSize()?.width ?? 0) >= 768) await row.hover();
  else await read.focus();
  await read.click();
}
