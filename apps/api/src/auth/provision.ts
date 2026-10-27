import { randomUUID } from "node:crypto";
import type { Client } from "@libsql/client";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { z } from "zod";
import { createLocalAuth, type AuthConfig } from "./local-auth";
import { account, session, user } from "./schema";

export const provisionSchema = z.object({
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  name: z.string().trim().min(1).max(200),
  password: z.string().min(12).max(128),
  id: z.uuid().optional(),
});

export async function provisionUser(client: Client, config: AuthConfig, raw: unknown) {
  const { id, ...body } = provisionSchema.parse(raw);
  const auth = createLocalAuth(client, config, { allowSignUp: true, ...(id === undefined ? {} : { userId: id }) });
  const result = await auth.api.signUpEmail({ body });
  // Provisioning must not leave an unattended session for the operator process.
  await drizzle(client).delete(session).where(eq(session.userId, result.user.id));
  return result.user;
}

export async function resetPassword(client: Client, config: AuthConfig, raw: unknown): Promise<void> {
  const input = provisionSchema.pick({ email: true, password: true }).parse(raw);
  const db = drizzle(client);
  const [owner] = await db.select().from(user).where(eq(user.email, input.email));
  if (!owner) throw new Error("No local account has that email address");
  const context = await createLocalAuth(client, config).$context;
  const password = await context.password.hash(input.password);
  await db.transaction(async (tx) => {
    const credential = and(eq(account.userId, owner.id), eq(account.providerId, "credential"));
    const [existing] = await tx.select({ id: account.id }).from(account).where(credential);
    const at = new Date();
    if (existing) {
      await tx.update(account).set({ password, updatedAt: at }).where(credential);
    } else {
      // Migrated OAuth accounts have an identity but no local password yet.
      await tx.insert(account).values({ id: randomUUID(), userId: owner.id, accountId: owner.id, providerId: "credential", password, createdAt: at, updatedAt: at });
    }
    await tx.delete(session).where(eq(session.userId, owner.id));
  });
}
