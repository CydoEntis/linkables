import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type AuthConfig = {
  appOrigin: string;
  secret: string;
  trustedOrigins: string[];
};

type Provisioning = { allowSignUp: true; userId?: string };

// Provisioning is only used by the operator CLI. The HTTP app never mounts the
// library handler, so extra library endpoints cannot become public by accident.
export function createLocalAuth(client: Client, config: AuthConfig, provisioning?: Provisioning) {
  return betterAuth({
    appName: "Linkables",
    baseURL: config.appOrigin,
    basePath: "/api/v1/auth",
    secret: config.secret,
    database: drizzleAdapter(drizzle(client, { schema }), { provider: "sqlite", schema }),
    trustedOrigins: [config.appOrigin, ...config.trustedOrigins],
    emailAndPassword: {
      enabled: true,
      disableSignUp: provisioning?.allowSignUp !== true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    advanced: {
      database: { generateId: ({ model }) => model === "user" && provisioning?.userId ? provisioning.userId : randomUUID() },
      useSecureCookies: new URL(config.appOrigin).protocol === "https:",
      // Reverse-proxy headers must not supply arbitrary rate-limit identities.
      ipAddress: { disableIpTracking: true },
    },
    plugins: [bearer()],
    telemetry: { enabled: false },
  });
}

export type LocalAuth = ReturnType<typeof createLocalAuth>;
