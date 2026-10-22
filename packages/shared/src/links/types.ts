import type { z } from "zod";
import type { LINK_VIEWS } from "./constants";
import type {
  listLinksQuerySchema,
  listLinksResponseSchema,
  resourceSummarySchema,
  saveLinkRequestSchema,
  saveLinkResponseSchema,
  savedLinkSchema,
} from "./schemas";

export type SaveLinkRequest = z.infer<typeof saveLinkRequestSchema>;
export type ResourceSummary = z.infer<typeof resourceSummarySchema>;
export type SavedLink = z.infer<typeof savedLinkSchema>;
export type SaveLinkResponse = z.infer<typeof saveLinkResponseSchema>;
export type ListLinksQuery = z.input<typeof listLinksQuerySchema>;
export type ListLinksResponse = z.infer<typeof listLinksResponseSchema>;
export type LinkView = (typeof LINK_VIEWS)[number];
