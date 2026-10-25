import type { z } from "zod";
import type {
  ownSharedCollectionSchema,
  ownSharedCollectionsResponseSchema,
  sharedCollectionSchema,
  sharedLinkSchema,
  shareStateSchema,
} from "./schemas";

export type ShareState = z.infer<typeof shareStateSchema>;
export type SharedLink = z.infer<typeof sharedLinkSchema>;
export type SharedCollection = z.infer<typeof sharedCollectionSchema>;
export type OwnSharedCollection = z.infer<typeof ownSharedCollectionSchema>;
export type OwnSharedCollectionsResponse = z.infer<typeof ownSharedCollectionsResponseSchema>;
