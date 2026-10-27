import type { z } from "zod";
import type {
  ownSharedCollectionSchema,
  ownSharedCollectionsResponseSchema,
  sharedCollectionSchema,
  sharedGroupSchema,
  sharedLinkSchema,
  shareAccessSchema,
  shareGroupSchema,
  shareScopeRequestSchema,
  shareStateSchema,
  viewerCodeRequestSchema,
  viewerSessionSchema,
  viewerVerifyRequestSchema,
} from "./schemas";

export type ShareState = z.infer<typeof shareStateSchema>;
export type ShareGroup = z.infer<typeof shareGroupSchema>;
export type ShareScopeRequest = z.infer<typeof shareScopeRequestSchema>;
export type SharedLink = z.infer<typeof sharedLinkSchema>;
export type SharedGroup = z.infer<typeof sharedGroupSchema>;
export type SharedCollection = z.infer<typeof sharedCollectionSchema>;
export type OwnSharedCollection = z.infer<typeof ownSharedCollectionSchema>;
export type OwnSharedCollectionsResponse = z.infer<typeof ownSharedCollectionsResponseSchema>;
export type ShareAccess = z.infer<typeof shareAccessSchema>;
export type ViewerCodeRequest = z.infer<typeof viewerCodeRequestSchema>;
export type ViewerVerifyRequest = z.infer<typeof viewerVerifyRequestSchema>;
export type ViewerSession = z.infer<typeof viewerSessionSchema>;
