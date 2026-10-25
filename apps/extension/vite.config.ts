import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { buildManifest } from "./manifest.ts";
import { parseExtensionEnv } from "./src/config/env-schema.ts";

const root = import.meta.dirname;

function packageVersion(): string {
  const { version } = JSON.parse(readFileSync(`${root}/package.json`, "utf8")) as { version: string };
  return version;
}

// Writes manifest.json into the build, so its host permissions follow the env the bundle was built for.
function manifest(mode: string): Plugin {
  return {
    name: "linkables-manifest",
    apply: "build",
    generateBundle() {
      const env = parseExtensionEnv(loadEnv(mode, root, "VITE_"));
      const built = buildManifest({ version: packageVersion(), appUrl: env.VITE_APP_URL, supabaseUrl: env.VITE_SUPABASE_URL });
      this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify(built, null, 2) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), manifest(mode)],
  build: {
    rolldownOptions: { input: `${root}/popup.html` },
    // MV3 allows no remote code, and an extension page loads from disk anyway.
    modulePreload: false,
    // One chunk is right here: the pop-up loads it from disk, so splitting buys nothing.
    chunkSizeWarningLimit: 800,
  },
}));
