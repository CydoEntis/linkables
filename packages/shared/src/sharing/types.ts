import type { z } from "zod";
import type {
  ownSharedCollectionSchema,
  ownSharedCollectionsResponseSchema,
  sharedCollectionSchema,
  sharedGroupSchema,
  sharedLinkSchema,
  shareGroupSchema,
  shareScopeRequestSchema,
  shareStateSchema,
} from "./schemas";

export type ShareState = z.infer<typeof shareStateSchema>;
export type ShareGroup = z.infer<typeof shareGroupSchema>;
export type ShareScopeRequest = z.infer<typeof shareScopeRequestSchema>;
export type SharedLink = z.infer<typeof sharedLinkSchema>;
export type SharedGroup = z.infer<typeof sharedGroupSchema>;
export type SharedCollection = z.infer<typeof sharedCollectionSchema>;
export type OwnSharedCollection = z.infer<typeof ownSharedCollectionSchema>;
export type OwnSharedCollectionsResponse = z.infer<typeof ownSharedCollectionsResponseSchema>;
