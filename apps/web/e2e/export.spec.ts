import { readFile } from "node:fs/promises";
import { exportResponseSchema } from "@linkables/shared/export";
import { expect, test } from "./fixtures";

const RUST = { url: "https://doc.rust-lang.org/rust-by-example/", resource: { title: "Rust by Example", fetchStatus: "fetched" as const } };
const TOKYO = { url: "https://www.youtube.com/watch?v=tokyo", resource: { title: "Tokyo night walk", fetchStatus: "fetched" as const } };

test.describe("at 1280 px", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("Export my links downloads the export as a file", async ({ page, seedLinks }) => {
    await seedLinks([RUST, { ...TOKYO, link: { note: "with ramen", pinned: true } }]);
    await page.goto("/");
    await page.getByRole("complementary").getByRole("button", { name: "Account" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Export my links" }).click();
    const file = await download;
    expect(file.suggestedFilename()).toMatch(/^linkables-export-\d{4}-\d{2}-\d{2}\.json$/);
    const data = exportResponseSchema.parse(JSON.parse(await readFile(await file.path(), "utf8")));
    expect(data.links.map((link) => link.originalUrl).sort()).toEqual([RUST.url, TOKYO.url].sort());
    expect(data.links.find((link) => link.originalUrl === TOKYO.url)).toMatchObject({ note: "with ramen", pinned: true });
    expect(file.suggestedFilename()).toBe(`linkables-export-${data.exportedAt.slice(0, 10)}.json`);
    await expect(page.getByText("Export downloaded")).toBeVisible();
  });
});
