import { parseExtensionEnv } from "./env-schema";

export const env = parseExtensionEnv(import.meta.env);
