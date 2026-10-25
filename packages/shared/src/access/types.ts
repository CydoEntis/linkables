import type { z } from "zod";
import type { accessRequestSchema } from "./schemas";

export type AccessRequestInput = z.input<typeof accessRequestSchema>;
export type AccessRequest = z.output<typeof accessRequestSchema>;
