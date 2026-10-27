import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { buildFirefoxManifest, buildManifest } from "./manifest.ts";

const root = import.meta.dirname;
function manifest(mode: string): Plugin {
  return {
    name: "linkables-manifest",
    apply: "build",
    generateBundle() {
      const { version } = JSON.parse(readFileSync(`${root}/package.json`, "utf8")) as { version: string };
      const options = { version };
      const manifest = mode === "firefox" ? buildFirefoxManifest(options) : buildManifest({ ...options, store: mode === "store" });
      const built = mode === "e2e" ? { ...manifest, host_permissions: ["http://127.0.0.1/*"] } : manifest;
      this.emitFile({ type: "asset", fileName: "manifest.json", source: JSON.stringify(built, null, 2) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), manifest(mode)],
  build: {
    rolldownOptions: {
      input: { popup: `${root}/popup.html`, sidepanel: `${root}/sidepanel.html`, worker: `${root}/src/worker.ts` },
      output: { entryFileNames: (chunk) => chunk.name === "worker" ? "worker.js" : "assets/[name]-[hash].js" },
    },
    modulePreload: false,
    chunkSizeWarningLimit: 800,
  },
}));

