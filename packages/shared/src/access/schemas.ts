import { z } from "zod";
import { ACCESS_EMAIL_MAX_LENGTH, ACCESS_NAME_MAX_LENGTH, ACCESS_USE_CASE_MAX_LENGTH } from "./constants";

// An empty field is no answer, so the form can send its inputs as they are.
function optionalText(max: number, error: string) {
  return z
    .string()
    .trim()
    .max(max, { error })
    .transform((text) => text || undefined)
    .optional();
}

// Addresses are compared ignoring case, so one person asking twice is one request.
export const accessRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .max(ACCESS_EMAIL_MAX_LENGTH, { error: "Enter a shorter email address" })
    .pipe(z.email({ error: "Enter a valid email address" }))
    .transform((email) => email.toLowerCase()),
  name: optionalText(ACCESS_NAME_MAX_LENGTH, `Keep your name under ${String(ACCESS_NAME_MAX_LENGTH)} characters`),
  useCase: optionalText(ACCESS_USE_CASE_MAX_LENGTH, `Keep this under ${String(ACCESS_USE_CASE_MAX_LENGTH)} characters`),
  // A honeypot: hidden from people, so only a bot fills it in.
  website: z.string().max(ACCESS_NAME_MAX_LENGTH).optional(),
});
