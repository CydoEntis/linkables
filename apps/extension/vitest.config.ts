import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig({ mode: "test", command: "serve" }),
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts", "store/**/*.test.ts", "manifest.test.ts"],
      setupFiles: ["src/test/setup.ts"],
      env: {
        VITE_SUPABASE_URL: "http://supabase.test",
        VITE_SUPABASE_ANON_KEY: "test-anon-key",
        VITE_APP_URL: "http://app.test",
      },
    },
  }),
);
