// Signs dist-firefox/ (run `pnpm release:firefox` first) as an unlisted add-on on
// addons.mozilla.org and leaves release/linkables-firefox-<version>.xpi plus the
// stable release/linkables-firefox.xpi. web-ext reads the owner's AMO keys from
// WEB_EXT_API_KEY and WEB_EXT_API_SECRET; they never go in a file in this repo.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist-firefox");
const release = join(root, "release");
const signed = join(release, "signed-firefox");
// The copy the app serves; check:firefox compares it with the build.
const published = join(root, "..", "web", "public", "downloads", "linkables-firefox.xpi");

const { version } = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8")) as { version: string };

rmSync(signed, { recursive: true, force: true });
mkdirSync(signed, { recursive: true });
const webExt = join(root, "node_modules", "web-ext", "bin", "web-ext.js");
execFileSync(process.execPath, [webExt, "sign", "--channel=unlisted", "--source-dir", dist, "--artifacts-dir", signed], { cwd: root, stdio: "inherit" });

const xpi = readdirSync(signed).find((name) => name.endsWith(".xpi"));
if (!xpi) throw new Error("web-ext signed nothing: no .xpi in release/signed-firefox");
copyFileSync(join(signed, xpi), join(release, `linkables-firefox-${version}.xpi`));
copyFileSync(join(signed, xpi), join(release, "linkables-firefox.xpi"));
mkdirSync(dirname(published), { recursive: true });
copyFileSync(join(signed, xpi), published);
console.log(`Wrote ${relative(root, join(release, "linkables-firefox.xpi"))} and linkables-firefox-${version}.xpi, and updated ${relative(root, published)}`);
