import type { z } from "zod";
import type { exportedLinkSchema, exportResponseSchema } from "./schemas";

export type ExportedLink = z.infer<typeof exportedLinkSchema>;
export type ExportResponse = z.infer<typeof exportResponseSchema>;
