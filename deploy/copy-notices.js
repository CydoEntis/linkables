import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, URL } from "node:url";
import process from "node:process";

const [inventoryFile, destination] = process.argv.slice(2);
if (!inventoryFile || !destination) throw new Error("Usage: copy-notices.js <pnpm-license-inventory.json> <output-directory>");
const inventory = JSON.parse(readFileSync(inventoryFile, "utf8"));
const notices = join(destination, "licenses");
mkdirSync(notices, { recursive: true });
copyFileSync(fileURLToPath(new URL("../LICENSE", import.meta.url)), join(notices, "Linkables-AGPL-3.0.txt"));
const index = ["# Bundled dependency notices", "", "Linkables: AGPL-3.0-only. Upstream works retain the licenses below.", ""];
for (const packages of Object.values(inventory)) {
  if (!Array.isArray(packages)) throw new Error("Invalid pnpm license inventory");
  for (const pkg of packages) {
    if (typeof pkg.name !== "string" || !Array.isArray(pkg.paths)) throw new Error("Invalid package license record");
    const label = pkg.name.replaceAll("/", "_") + "-" + pkg.versions.join("-");
    index.push(`- ${pkg.name} ${pkg.versions.join(", ")}: ${pkg.license}`);
    for (const path of pkg.paths) {
      const files = readdirSync(path, { withFileTypes: true }).filter((entry) => entry.isFile() && /^(licen[cs]e|notice|copying|copyright)(\.|$)/i.test(entry.name));
      for (const file of files) copyFileSync(join(path, file.name), join(notices, label + "-" + file.name));
    }
  }
}
writeFileSync(join(notices, "README.md"), index.join("\n") + "\n");
