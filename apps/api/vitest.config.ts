import { defineConfig } from "vitest/config";

const dbTests = "**/*.db.test.ts";

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["{src,test}/**/*.test.ts"], exclude: [dbTests] },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: [`{src,test}/${dbTests}`],
          globalSetup: ["test/db-setup.ts"],
          // Every file truncates the same tables, so files must not overlap.
          fileParallelism: false,
        },
      },
    ],
  },
});
