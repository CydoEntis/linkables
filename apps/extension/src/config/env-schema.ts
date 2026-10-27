import { z } from "zod";

// Hosts are selected at runtime; builds contain no instance credentials or addresses.
const extensionEnvSchema = z.object({});
export type ExtensionEnv = z.infer<typeof extensionEnvSchema>;
export function parseExtensionEnv(raw: unknown): ExtensionEnv { return extensionEnvSchema.parse(raw); }
