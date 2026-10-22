import type { z } from "zod";
import type { collectionRequestSchema, collectionSchema, listCollectionsResponseSchema } from "./schemas";

export type CollectionRequest = z.infer<typeof collectionRequestSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type ListCollectionsResponse = z.infer<typeof listCollectionsResponseSchema>;
