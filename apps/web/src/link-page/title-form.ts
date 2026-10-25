import { TITLE_MAX, UNSAFE_TEXT_CHARS, updateLinkRequestSchema } from "@linkables/shared/links";
import { z } from "zod";

const TOO_LONG = `Titles can be up to ${String(TITLE_MAX)} characters`;
const NOT_ALLOWED = "That title has characters that can't be saved";

// The API's own rule; the first checks only swap in friendlier copy for its limits.
// A blank title comes out as null, which brings back the fetched title.
export const titleFormSchema = z.object({
  title: z
    .string()
    .refine((title) => title.replace(/\s+/g, " ").trim().length <= TITLE_MAX, { error: TOO_LONG, abort: true })
    .refine((title) => !UNSAFE_TEXT_CHARS.test(title.replace(/\s+/g, " ")), { error: NOT_ALLOWED, abort: true })
    .pipe(updateLinkRequestSchema.shape.titleOverride.unwrap().unwrap()),
});

export type TitleFormInput = z.input<typeof titleFormSchema>;
export type TitleFormOutput = z.output<typeof titleFormSchema>;
