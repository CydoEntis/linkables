import { z } from "zod";
import { GROUP_NAME_MAX_LENGTH } from "./constants";

const groupName = z
  .string()
  .trim()
  .min(1, { error: "name must not be empty" })
  .max(GROUP_NAME_MAX_LENGTH, { error: `name must be at most ${String(GROUP_NAME_MAX_LENGTH)} characters` });

export const groupRequestSchema = z.strictObject({ name: groupName });

export const groupOrderRequestSchema = z.strictObject({
  ids: z.array(z.uuid()).refine((ids) => new Set(ids).size === ids.length, { error: "ids must not repeat" }),
});

// groupId null takes the link out of its group, back to the collection's ungrouped links.
export const moveLinkRequestSchema = z.strictObject({ groupId: z.uuid().nullable() });

export const groupSchema = z.strictObject({
  id: z.uuid(),
  name: z.string(),
  position: z.number().int().nonnegative(),
  shared: z.boolean(),
  linkCount: z.number().int().nonnegative(),
});

// items are in position order.
export const listGroupsResponseSchema = z.strictObject({ items: z.array(groupSchema) });
