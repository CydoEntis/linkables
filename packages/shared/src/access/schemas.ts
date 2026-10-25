import { z } from "zod";
import {
  ACCESS_EMAIL_MAX_LENGTH,
  ACCESS_INVALID_EMAIL,
  ACCESS_NAME_MAX_LENGTH,
  ACCESS_USE_CASE_MAX_LENGTH,
} from "./constants";

// These answers end up in a plain-text email, so a name stays on one line and a
// use case keeps only its line breaks and tabs: neither can forge another field.
const singleLine = (text: string) => text.replace(/\p{Cc}+/gu, " ");
const multiLine = (text: string) => text.replace(/\r\n?/g, "\n").replace(/(?![\n\t])\p{Cc}/gu, "");

// An empty field is no answer, so the form can send its inputs as they are.
function optionalText(max: number, error: string, clean: (text: string) => string) {
  return z
    .string()
    .trim()
    .max(max, { error })
    .transform((text) => clean(text).trim() || undefined)
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
  name: optionalText(ACCESS_NAME_MAX_LENGTH, `Keep your name to ${String(ACCESS_NAME_MAX_LENGTH)} characters or fewer`, singleLine),
  useCase: optionalText(
    ACCESS_USE_CASE_MAX_LENGTH,
    `Keep this to ${String(ACCESS_USE_CASE_MAX_LENGTH)} characters or fewer`,
    multiLine,
  ),
  // A honeypot: hidden from people, so only a bot fills it in. Named so that
  // browser autofill, which matches names like "website", leaves it empty.
  hp_confirm_field: z.string().max(ACCESS_NAME_MAX_LENGTH).optional(),
});
