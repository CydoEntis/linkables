import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
      setupFiles: ["src/test/setup.ts"],
      env: {
        VITE_SUPABASE_URL: "http://supabase.test",
        VITE_SUPABASE_ANON_KEY: "test-anon-key",
        VITE_API_URL: "http://api.test",
        VITE_AUTH_REDIRECT_URL: "http://localhost:5173/",
      },
    },
  }),
);
