import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

// Rule 2: only the SSRF-guarded fetcher makes outbound HTTP from the API.
const GUARDED_FETCHER = "apps/api/src/metadata/fetcher.ts";
const OUTBOUND_HTTP_MESSAGE = "Outbound HTTP goes through apps/api/src/metadata/fetcher.ts (ADR-0003).";
const restrictImports = (names) => [
  "error",
  { paths: names.map((name) => ({ name, message: OUTBOUND_HTTP_MESSAGE })) },
];

export default defineConfig(
  { ignores: ["**/dist/", "**/node_modules/"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["apps/api/**/*.ts"],
    ignores: [GUARDED_FETCHER],
    rules: {
      "no-restricted-globals": ["error", { name: "fetch", message: OUTBOUND_HTTP_MESSAGE }],
      "no-restricted-imports": restrictImports(["undici", "http", "https", "node:http", "node:https"]),
    },
  },
  {
    // Tests may run local servers with http; outbound clients stay banned.
    files: ["apps/api/**/*.test.ts", "apps/api/test/**"],
    rules: {
      "no-restricted-imports": restrictImports(["undici", "https", "node:https"]),
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
