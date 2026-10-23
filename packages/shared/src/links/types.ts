import type { z } from "zod";
import type { LINK_SORTS, LINK_SOURCES, LINK_VIEWS, RESOURCE_KINDS } from "./constants";
import type {
  listLinksQuerySchema,
  listLinksResponseSchema,
  resourceSummarySchema,
  saveLinkRequestSchema,
  saveLinkResponseSchema,
  savedLinkSchema,
  updateLinkRequestSchema,
} from "./schemas";

export type SaveLinkRequest = z.infer<typeof saveLinkRequestSchema>;
export type ResourceSummary = z.infer<typeof resourceSummarySchema>;
export type SavedLink = z.infer<typeof savedLinkSchema>;
export type SaveLinkResponse = z.infer<typeof saveLinkResponseSchema>;
export type ListLinksQuery = z.input<typeof listLinksQuerySchema>;
export type ListLinksResponse = z.infer<typeof listLinksResponseSchema>;
export type UpdateLinkRequest = z.input<typeof updateLinkRequestSchema>;
export type LinkSource = (typeof LINK_SOURCES)[number];
export type LinkView = (typeof LINK_VIEWS)[number];
export type LinkSort = (typeof LINK_SORTS)[number];
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
