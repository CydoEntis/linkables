import { z } from "zod";
import { LOG_LEVELS } from "../log/logger";

const webOrigin = z.url().refine((value) => new URL(value).origin === value && ["http:", "https:"].includes(new URL(value).protocol), {
  message: "must be a bare HTTP(S) origin such as https://links.example.com",
});
const extensionOrigin = z.string().regex(/^(chrome-extension:\/\/[a-p]{32}|moz-extension:\/\/[a-zA-Z0-9-]+)$/);
const corsOrigins = z.string().default("").transform((value) => value.split(",").map((entry) => entry.trim()).filter(Boolean))
  .pipe(z.array(z.union([extensionOrigin, webOrigin])));
const optionalEmail = z.preprocess((value) => value === "" ? undefined : value, z.email().optional());
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("production"),
  DATABASE_URL: z.string().startsWith("file:").default("file:./data/linkables.db"),
  APP_ORIGIN: webOrigin,
  AUTH_SECRET: z.string().min(32),
  CORS_ORIGINS: corsOrigins,
  TRUST_PROXY: z.stringbool().default(false),
  WORKER_ENABLED: z.stringbool().default(true),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
  RESEND_API_KEY: z.string().transform((value) => value || undefined).optional(),
  MAIL_FROM: optionalEmail,
  OWNER_EMAIL: optionalEmail,
});

type Env = z.infer<typeof envSchema>;
export type Config = ReturnType<typeof toConfig>;
export type ParseEnvResult = { ok: true; config: Config } | { ok: false; message: string };

function toConfig(env: Env) {
  const origins = [...new Set([env.APP_ORIGIN, ...env.CORS_ORIGINS])];
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    corsOrigins: origins,
    trustProxy: env.TRUST_PROXY,
    workerEnabled: env.WORKER_ENABLED,
    databaseUrl: env.DATABASE_URL,
    auth: { appOrigin: env.APP_ORIGIN, secret: env.AUTH_SECRET, trustedOrigins: origins },
    resendApiKey: env.RESEND_API_KEY,
    mailFrom: env.MAIL_FROM,
    ownerEmail: env.OWNER_EMAIL,
  };
}

export function parseEnv(raw: Record<string, string | undefined>): ParseEnvResult {
  const parsed = envSchema.safeParse(raw);
  if (parsed.success) return { ok: true, config: toConfig(parsed.data) };
  return { ok: false, message: `Invalid environment:\n${parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n")}` };
}
