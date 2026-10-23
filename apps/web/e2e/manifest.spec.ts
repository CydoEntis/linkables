import { expect, test } from "./fixtures";

type Icon = { src: string; sizes: string; type: string; purpose: string };

// Bytes 16-23 of a PNG are its width and height (IHDR).
function pngSize(body: Buffer): string {
  return `${String(body.readUInt32BE(16))}x${String(body.readUInt32BE(20))}`;
}

test("the manifest is served with the share target and installable icons", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("/manifest.webmanifest");

  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as Record<string, unknown> & { icons: Icon[] };
  expect(manifest).toMatchObject({
    name: "linkables",
    short_name: "linkables",
    start_url: "/",
    display: "standalone",
    background_color: "#121212",
    theme_color: "#121212",
    share_target: { action: "/save", method: "GET", enctype: "application/x-www-form-urlencoded", params: { title: "title", text: "text", url: "url" } },
  });
  expect(manifest).not.toHaveProperty("prefer_related_applications");

  const wanted = ["192x192 any", "512x512 any", "192x192 maskable", "512x512 maskable"];
  expect(manifest.icons.map((icon) => `${icon.sizes} ${icon.purpose}`)).toEqual(wanted);
  for (const icon of manifest.icons) {
    const file = await request.get(icon.src);
    expect(file.headers()["content-type"]).toBe("image/png");
    expect(pngSize(await file.body()), icon.src).toBe(icon.sizes);
  }

  const appleIcon = await request.get((await page.locator('link[rel="apple-touch-icon"]').getAttribute("href")) ?? "");
  expect(pngSize(await appleIcon.body())).toBe("180x180");
});

// Headless Chrome does not run the install check (getInstallabilityErrors stays
// empty even for display: browser), so the fields above stand in for it.
test("Chrome parses the manifest without warnings", async ({ page }) => {
  await page.goto("/");
  const cdp = await page.context().newCDPSession(page);
  const { url, errors } = await cdp.send("Page.getAppManifest");
  expect(url).toMatch(/\/manifest\.webmanifest$/);
  expect(errors).toEqual([]);
});
