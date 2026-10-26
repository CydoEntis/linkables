import type { z } from "zod";
import type { extensionMessageSchema, extensionSessionSchema } from "./schemas";

export type ExtensionSession = z.infer<typeof extensionSessionSchema>;

export type ExtensionMessage = z.infer<typeof extensionMessageSchema>;
