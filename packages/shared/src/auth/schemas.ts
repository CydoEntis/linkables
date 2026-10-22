import { z } from "zod";

export const meSchema = z.strictObject({ id: z.uuid() });
