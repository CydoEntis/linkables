// Runs after `vite build`: renders the landing, legal and support pages to static
// HTML in dist/, so search engines and link previews get real content and the
// pages load without the app. Caddy serves them before the SPA fallback. It also
// writes the app shell with the shared collection link preview, for /s/*.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import type { BuiltAssets } from "./document";
import type { OutputFile } from "./render-pages";

const webRoot = fileURLToPath(new URL("../..", import.meta.url));
const dist = fileURLToPath(new URL("../../dist/", import.meta.url));

function builtAssets(indexHtml: string): BuiltAssets {
  const entry = /<script type="module"[^>]*\ssrc="([^"]+)"/.exec(indexHtml)?.[1];
  const stylesheets = [...indexHtml.matchAll(/<link rel="stylesheet"[^>]*\shref="([^"]+)"/g)].map((match) => match[1] ?? "");
  if (!entry || stylesheets.length === 0) throw new Error("dist/index.html has no entry script or stylesheet; run vite build first");
  return { entry, stylesheets };
}

const indexHtml = readFileSync(`${dist}index.html`, "utf8");
const assets = builtAssets(indexHtml);
const vite = await createServer({ root: webRoot, mode: "production", server: { middlewareMode: true }, appType: "custom", logLevel: "warn" });
try {
  const { renderMarketingFiles } = (await vite.ssrLoadModule("/src/marketing/render-pages.tsx")) as {
    renderMarketingFiles: (assets: BuiltAssets) => OutputFile[];
  };
  for (const { file, contents } of renderMarketingFiles(assets)) {
    writeFileSync(`${dist}${file}`, contents);
    console.log(`prerendered dist/${file}`);
  }
  const { SHARED_SHELL_FILE, sharedShellHtml } = (await vite.ssrLoadModule("/src/sharing/shared-shell.ts")) as {
    SHARED_SHELL_FILE: string;
    sharedShellHtml: (indexHtml: string) => string;
  };
  writeFileSync(`${dist}${SHARED_SHELL_FILE}`, sharedShellHtml(indexHtml));
  console.log(`prerendered dist/${SHARED_SHELL_FILE}`);
} finally {
  await vite.close();
}
