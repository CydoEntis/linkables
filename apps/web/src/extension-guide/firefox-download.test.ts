import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "vitest";

// Paths are relative to apps/web, where vitest runs.
const xpi = resolve("public/downloads/linkables-firefox.xpi");
const extensionPackage = resolve("../extension/package.json");

// The server builds the web app and copies public/ into the image, so this file is the only way the add-on gets served.
test("the Firefox add-on served from public/ is a zip of the current extension version", () => {
  const manifest = JSON.parse(execFileSync("unzip", ["-p", xpi, "manifest.json"], { encoding: "utf8" })) as { version: string };
  const { version } = JSON.parse(readFileSync(extensionPackage, "utf8")) as { version: string };
  expect(manifest.version).toBe(version);
});
