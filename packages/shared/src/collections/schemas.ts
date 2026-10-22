import { z } from "zod";
import { COLLECTION_NAME_MAX_LENGTH } from "./constants";

// The body of both create and rename.
export const collectionRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: "name must not be empty" })
    .max(COLLECTION_NAME_MAX_LENGTH, {
      error: `name must be at most ${String(COLLECTION_NAME_MAX_LENGTH)} characters`,
    }),
});

export const collectionSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
});

export const listCollectionsResponseSchema = z.strictObject({
  items: z.array(collectionSchema),
});
