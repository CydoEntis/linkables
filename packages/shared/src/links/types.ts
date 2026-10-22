import type { z } from "zod";
import type { resourceSummarySchema, saveLinkRequestSchema, saveLinkResponseSchema, savedLinkSchema } from "./schemas";

export type SaveLinkRequest = z.infer<typeof saveLinkRequestSchema>;
export type ResourceSummary = z.infer<typeof resourceSummarySchema>;
export type SavedLink = z.infer<typeof savedLinkSchema>;
export type SaveLinkResponse = z.infer<typeof saveLinkResponseSchema>;
