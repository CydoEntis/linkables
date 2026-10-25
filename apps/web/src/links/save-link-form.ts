import { ERROR_CODES } from "@linkables/shared/http";
import { saveLinkRequestSchema, URL_MAX_LENGTH } from "@linkables/shared/links";
import { canonicalize } from "@linkables/shared/url";
import { z } from "zod";
import { ApiError, NETWORK_ERROR } from "@linkables/shared/api-client";

const NOT_A_LINK = "Links must start with http:// or https://";
const TOO_LONG = "That link is too long.";

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const BARE_DOMAIN = /^[a-z\d-]+(\.[a-z\d-]+)*\.[a-z]{2,}(\/\S*)?$/i;

// "youtube.com/watch?v=…" is how people paste from an address bar.
function withScheme(text: string): string {
  return !HAS_SCHEME.test(text) && BARE_DOMAIN.test(text) ? `https://${text}` : text;
}

const fitsLength = (url: string) => url.trim().length <= URL_MAX_LENGTH;

// Built on the API's request field and its canonicalize rule, so a link the form
// accepts is one the API accepts. The first check only swaps in friendlier copy
// for the shared length limit; the pipe stops there when it fails.
export const saveUrlSchema = z
  .string()
  .refine(fitsLength, { error: TOO_LONG, abort: true })
  .pipe(saveLinkRequestSchema.shape.url)
  .transform(withScheme)
  .refine(fitsLength, { error: TOO_LONG, abort: true })
  .refine((url) => canonicalize(url).ok, { error: NOT_A_LINK });

export const saveLinkFormSchema = z.object({ url: saveUrlSchema });

export type SaveLinkFormInput = z.input<typeof saveLinkFormSchema>;
export type SaveLinkFormOutput = z.output<typeof saveLinkFormSchema>;

export type SaveProblem = { kind: "inline" | "toast"; message: string } | { kind: "none" };

export function saveProblem(error: Error): SaveProblem {
  const code = error instanceof ApiError ? error.code : undefined;
  switch (code) {
    case ERROR_CODES.VALIDATION:
      return { kind: "inline", message: NOT_A_LINK };
    case ERROR_CODES.RATE_LIMIT:
      return { kind: "toast", message: "Too many saves. Wait a minute." };
    case NETWORK_ERROR:
      return { kind: "toast", message: "You're offline. The link wasn't saved." };
    case ERROR_CODES.UNAUTHENTICATED:
      return { kind: "none" };
    default:
      return { kind: "toast", message: "Couldn't save the link. Try again." };
  }
}
