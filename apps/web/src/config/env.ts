import { z } from "zod";

const webEnvSchema = z.object({
  VITE_API_URL: z.preprocess((value) => value === "" ? undefined : value, z.url().optional()),
  VITE_IOS_SHORTCUT_URL: z.preprocess((value) => value === "" ? undefined : value, z.url({ protocol: /^https$/, hostname: z.regexes.domain }).optional()),
});

export function parseWebEnv(raw: unknown, origin = typeof window === "undefined" ? "" : window.location.origin) {
  const parsed = webEnvSchema.safeParse(raw);
  if (!parsed.success) throw new Error(`Invalid web env: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  return { ...parsed.data, VITE_API_URL: (parsed.data.VITE_API_URL ?? origin).replace(/\/+$/, "") };
}

export type WebEnv = ReturnType<typeof parseWebEnv>;
export const env = parseWebEnv(import.meta.env);
