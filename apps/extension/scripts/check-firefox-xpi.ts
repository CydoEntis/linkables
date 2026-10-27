// Fails when the committed, signed firefox/linkables-firefox.xpi no longer holds what
// dist-firefox/ builds from the current source (run `pnpm release:firefox` first, with
// the production env). The build is reproducible, so every file must match byte for byte;
// only the signature in META-INF is the xpi's own.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const dist = join(root, "dist-firefox");
const xpi = join(root, "firefox", "linkables-firefox.xpi");

function filesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1).replaceAll("\\", "/"))
    .filter((name) => !name.startsWith("META-INF/") && name !== ".amo-upload-uuid")
    .sort();
}

function differences(built: string, signed: string): string[] {
  const builtFiles = filesIn(built);
  const signedFiles = filesIn(signed);
  const missing = builtFiles.filter((name) => !signedFiles.includes(name)).map((name) => `not in the xpi: ${name}`);
  const extra = signedFiles.filter((name) => !builtFiles.includes(name)).map((name) => `only in the xpi: ${name}`);
  const changed = builtFiles
    .filter((name) => signedFiles.includes(name))
    .filter((name) => !readFileSync(join(built, name)).equals(readFileSync(join(signed, name))))
    .map((name) => `differs: ${name}`);
  return [...missing, ...extra, ...changed];
}

const unpacked = mkdtempSync(join(tmpdir(), "linkables-xpi-"));
try {
  execFileSync("unzip", ["-q", xpi, "-d", unpacked]);
  const problems = differences(dist, unpacked);
  if (problems.length > 0) {
    console.error(`firefox/linkables-firefox.xpi is stale:\n${problems.join("\n")}\nBump version in package.json, run release:firefox and sign:firefox, and commit the new xpi (README, Firefox).`);
    process.exit(1);
  }
  console.log("firefox/linkables-firefox.xpi matches the current source");
} finally {
  rmSync(unpacked, { recursive: true, force: true });
}
