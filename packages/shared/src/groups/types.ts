import type { z } from "zod";
import type {
  groupOrderRequestSchema,
  groupRequestSchema,
  groupSchema,
  listGroupsResponseSchema,
  moveLinkRequestSchema,
} from "./schemas";

export type GroupRequest = z.infer<typeof groupRequestSchema>;
export type GroupOrderRequest = z.infer<typeof groupOrderRequestSchema>;
export type MoveLinkRequest = z.infer<typeof moveLinkRequestSchema>;
export type Group = z.infer<typeof groupSchema>;
export type ListGroupsResponse = z.infer<typeof listGroupsResponseSchema>;
