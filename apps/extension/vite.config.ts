import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { build, defineConfig, loadEnv, type Plugin } from "vite";
import { buildFirefoxManifest, buildManifest } from "./manifest.ts";
import { parseExtensionEnv, type ExtensionEnv } from "./src/config/env-schema.ts";

const root = import.meta.dirname;

function packageVersion(): string {
  const { version } = JSON.parse(readFileSync(`${root}/package.json`, "utf8")) as { version: string };
  return version;
}

// The Web Store and Firefox builds go to friends as is, so they must talk to production.
const STORE_APP_URL = "https://linkables.app";

function checkProductionEnv(env: ExtensionEnv) {
  if (env.VITE_APP_URL.replace(/\/+$/, "") !== STORE_APP_URL) throw new Error(`The store and Firefox builds need VITE_APP_URL=${STORE_APP_URL}`);
  if (!env.VITE_SUPABASE_URL.startsWith("https://")) throw new Error("The store and Firefox builds need the production VITE_SUPABASE_URL");
}

// Writes manifest.json into the build, so its host permissions follow the env the bundle was built for.
function manifest(mode: string): Plugin {
  return {
    name: "linkables-manifest",
    apply: "build",
    generateBundle() {
      const env = parseExtensionEnv(loadEnv(mode, root, "VITE_"));
      const store = mode === "store";
      const firefox = mode === "firefox";
      if (store || firefox) checkProductionEnv(env);
      const options = { version: packageVersion(), appUrl: env.VITE_APP_URL, supabaseUrl: env.VITE_SUPABASE_URL };
      const built = firefox ? buildFirefoxManifest(options) : buildManifest({ ...options, store });
      this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify(built, null, 2) });
    },
  };
}

// Chrome loads a content script as a classic script, so it cannot import the chunks
// it would share with the pop-up and worker: it gets a build of its own, as one IIFE.
function contentScript(mode: string): Plugin {
  let outDir = "dist";
  return {
    name: "linkables-content-script",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async closeBundle() {
      await build({
        configFile: false,
        root,
        mode,
        logLevel: "warn",
        build: {
          outDir,
          emptyOutDir: false,
          copyPublicDir: false,
          lib: { entry: `${root}/src/connect/content-script.ts`, formats: ["iife"], name: "linkablesContentScript", fileName: () => "content-script.js" },
        },
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), manifest(mode), contentScript(mode)],
  build: {
    rolldownOptions: {
      input: { popup: `${root}/popup.html`, sidepanel: `${root}/sidepanel.html`, worker: `${root}/src/worker.ts` },
      // The manifest names the worker, so its file name must not carry a hash.
      output: { entryFileNames: (chunk) => (chunk.name === "worker" ? "worker.js" : "assets/[name]-[hash].js") },
    },
    // MV3 allows no remote code, and an extension page loads from disk anyway.
    modulePreload: false,
    // The shared chunks (React, supabase-js) load from disk, so their size costs little.
    chunkSizeWarningLimit: 800,
  },
}));
