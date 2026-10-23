import type { z } from "zod";
import type {
  collectionRequestSchema,
  collectionSchema,
  coverTileSchema,
  listCollectionsResponseSchema,
  listedCollectionSchema,
  updateCollectionRequestSchema,
} from "./schemas";

export type CollectionRequest = z.infer<typeof collectionRequestSchema>;
export type UpdateCollectionRequest = z.infer<typeof updateCollectionRequestSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type CoverTile = z.infer<typeof coverTileSchema>;
export type ListedCollection = z.infer<typeof listedCollectionSchema>;
export type ListCollectionsResponse = z.infer<typeof listCollectionsResponseSchema>;
