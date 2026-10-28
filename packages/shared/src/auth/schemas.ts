import { z } from "zod";

export const meSchema = z.strictObject({ id: z.uuid() });

export const signInRequestSchema = z.strictObject({
  email: z.email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
});

export const sessionSchema = z.strictObject({
  user: z.strictObject({ id: z.uuid(), email: z.email(), name: z.string() }),
  token: z.string().min(1),
  expiresAt: z.iso.datetime(),
});
