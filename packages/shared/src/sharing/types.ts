import type { z } from "zod";
import type { sharedCollectionSchema, sharedLinkSchema, shareStateSchema } from "./schemas";

export type ShareState = z.infer<typeof shareStateSchema>;
export type SharedLink = z.infer<typeof sharedLinkSchema>;
export type SharedCollection = z.infer<typeof sharedCollectionSchema>;
