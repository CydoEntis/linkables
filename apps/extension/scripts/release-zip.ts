// Packs dist/ (run `pnpm build` first) into release/linkables-chrome-<version>.zip,
// the file friends unzip and load with "Load unpacked".
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { zipFiles } from "./zip.ts";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist");

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

const { version } = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8")) as { version: string };
const files = filesUnder(dist).map((path) => ({ name: relative(dist, path).split(sep).join("/"), data: readFileSync(path) }));
const out = join(root, "release", `linkables-chrome-${version}.zip`);
mkdirSync(join(root, "release"), { recursive: true });
writeFileSync(out, zipFiles(files));
console.log(`Wrote ${relative(root, out)} (${String(files.length)} files)`);
