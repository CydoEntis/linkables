import type { z } from "zod";
import type { meSchema } from "./schemas";

export type Me = z.infer<typeof meSchema>;
