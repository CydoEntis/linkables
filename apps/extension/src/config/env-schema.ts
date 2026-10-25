import { z } from "zod";

const extensionEnvSchema = z.object({
  VITE_SUPABASE_URL: z.url(),
  // The public anon key; it ships inside the extension by design, as in the web build.
  VITE_SUPABASE_ANON_KEY: z.string().min(1),
  // The web app's origin, which also serves the API under /api/v1 (ADR-0005).
  VITE_APP_URL: z.url(),
});

export type ExtensionEnv = z.infer<typeof extensionEnvSchema>;

export function parseExtensionEnv(raw: unknown): ExtensionEnv {
  const parsed = extensionEnvSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const names = parsed.error.issues.map((issue) => issue.path.join("."));
  throw new Error(`Invalid extension env, check apps/extension/.env: ${names.join(", ")}`);
}
