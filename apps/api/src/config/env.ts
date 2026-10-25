import { z } from "zod";
import { LOG_LEVELS } from "../log/logger";

const webOrigin = z.url().refine((value) => new URL(value).origin === value, {
  message: "each entry must be a bare origin such as https://app.example.com",
});

// The extension's pages send Origin chrome-extension://<id>. URL gives such a URL
// the opaque origin "null", so it is matched by shape: an id is 32 letters a to p.
const chromeExtensionOrigin = z.string().regex(/^chrome-extension:\/\/[a-p]{32}$/);

const origin = z.union([chromeExtensionOrigin, webOrigin]);

const corsOrigins = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  )
  .pipe(z.array(origin).min(1));

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    DATABASE_URL: z.url(),
    MIGRATION_DATABASE_URL: z.url(),
    SUPABASE_URL: z.url(),
    CORS_ORIGINS: corsOrigins,
    WORKER_ENABLED: z.stringbool(),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
    AUTH_TEST_JWKS: z.string().min(1).optional(),
    // Unset, the API takes access requests without emailing the owner about them.
    // The .env example leaves it empty, which counts as unset.
    RESEND_API_KEY: z
      .string()
      .transform((key) => key || undefined)
      .optional(),
  })
  .refine((env) => env.AUTH_TEST_JWKS === undefined || env.NODE_ENV === "test", {
    path: ["AUTH_TEST_JWKS"],
    message: "is only allowed when NODE_ENV=test",
  });

type Env = z.infer<typeof envSchema>;

export type Config = ReturnType<typeof toConfig>;

export type ParseEnvResult = { ok: true; config: Config } | { ok: false; message: string };

function toConfig(env: Env) {
  const authBase = `${env.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1`;
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    corsOrigins: env.CORS_ORIGINS,
    workerEnabled: env.WORKER_ENABLED,
    databaseUrl: env.DATABASE_URL,
    migrationDatabaseUrl: env.MIGRATION_DATABASE_URL,
    auth: {
      issuer: authBase,
      jwksUrl: `${authBase}/.well-known/jwks.json`,
      testJwks: env.AUTH_TEST_JWKS,
    },
    resendApiKey: env.RESEND_API_KEY,
  };
}

// Zod's issue messages describe the expected shape, never the received value,
// so naming the path and message cannot leak a secret.
function describeIssues(error: z.ZodError): string {
  const lines = error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
  return `Invalid environment:\n${lines.join("\n")}`;
}

export function parseEnv(raw: Record<string, string | undefined>): ParseEnvResult {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: describeIssues(parsed.error) };
  return { ok: true, config: toConfig(parsed.data) };
}
