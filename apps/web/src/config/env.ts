import { z } from "zod";

const webEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  VITE_API_URL: z.url(),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function parseWebEnv(raw: unknown): WebEnv {
  const parsed = webEnvSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const names = parsed.error.issues.map((issue) => issue.path.join("."));
  throw new Error(`Invalid web env, check apps/web/.env: ${names.join(", ")}`);
}

export const env = parseWebEnv(import.meta.env);
