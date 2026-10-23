import { z } from "zod";

// The router JSON-parses each value, so "?text=42" arrives as a number; every
// field is turned back into the text that was shared.
const sharedText = z.preprocess(
  (value) => (value === undefined || typeof value === "string" ? value : JSON.stringify(value)),
  z.string().optional(),
);

// The share target and the bookmark button send these (manifest share_target params).
export const saveSearchSchema = z.object({
  url: sharedText,
  text: sharedText,
  title: sharedText,
  // Set by the desktop bookmark button, whose popup window closes itself after a save.
  popup: z.preprocess((value) => value !== undefined && value !== false && value !== 0, z.boolean()).optional(),
});

export type SaveSearch = z.infer<typeof saveSearchSchema>;
