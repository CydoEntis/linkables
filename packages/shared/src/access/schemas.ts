import { z } from "zod";
import {
  ACCESS_EMAIL_MAX_LENGTH,
  ACCESS_INVALID_EMAIL,
  ACCESS_NAME_MAX_LENGTH,
  ACCESS_USE_CASE_MAX_LENGTH,
} from "./constants";

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
    .pipe(z.email({ error: ACCESS_INVALID_EMAIL }))
    .transform((email) => email.toLowerCase()),
  name: optionalText(ACCESS_NAME_MAX_LENGTH, `Keep your name to ${String(ACCESS_NAME_MAX_LENGTH)} characters or fewer`),
  useCase: optionalText(ACCESS_USE_CASE_MAX_LENGTH, `Keep this to ${String(ACCESS_USE_CASE_MAX_LENGTH)} characters or fewer`),
  // A honeypot: hidden from people, so only a bot fills it in.
  website: z.string().max(ACCESS_NAME_MAX_LENGTH).optional(),
});
