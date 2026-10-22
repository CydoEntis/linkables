import { z } from "zod";
import { ValidationError } from "./errors";

function firstErrorPerField(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const { path, message } of error.issues) {
    const [field] = path;
    if (field !== undefined) fieldErrors[String(field)] ??= message;
  }
  return fieldErrors;
}

export function parseWith<T extends z.ZodType>(schema: T, message: string) {
  return (value: unknown): z.output<T> => {
    const parsed = schema.safeParse(value);
    if (parsed.success) return parsed.data;
    throw new ValidationError(message, { fieldErrors: firstErrorPerField(parsed.error) });
  };
}
