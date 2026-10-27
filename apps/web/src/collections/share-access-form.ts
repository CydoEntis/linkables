import { SHARE_ACCESS_MODES, shareAccessSchema } from "@linkables/shared/sharing";
import { z } from "zod";

// People paste a list from a mail client or a spreadsheet: any run of commas, semicolons, spaces or newlines separates two.
// An address in angle brackets ("Sam <sam@example.com>") keeps only the address.
export function splitEmails(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((part) => part.replace(/^<|>$/g, ""))
    .filter((part) => part !== "");
}

// The one list box stays text in the form and becomes the API's array on the way out, checked by the API's own schema.
export const shareAccessFormSchema = z
  .object({ mode: z.enum(SHARE_ACCESS_MODES), emails: z.string().transform(splitEmails) })
  .pipe(shareAccessSchema);

export type ShareAccessFormInput = z.input<typeof shareAccessFormSchema>;
