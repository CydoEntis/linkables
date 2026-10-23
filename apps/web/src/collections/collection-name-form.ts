import { COLLECTION_NAME_MAX_LENGTH, collectionRequestSchema, type ListedCollection } from "@linkables/shared/collections";
import { ERROR_CODES } from "@linkables/shared/http";
import { z } from "zod";
import { isApiError } from "../api/client";
import { displayName } from "./display-name";

const NO_NAME = "Give it a name";
const TOO_LONG = `Names can be up to ${String(COLLECTION_NAME_MAX_LENGTH)} characters`;

// Built on the API's own name rule; the first checks only swap in friendlier copy
// for the shared limits, and the pipe stops at the first that fails.
export const collectionNameFormSchema = z.object({
  name: z
    .string()
    .refine((name) => name.trim() !== "", { error: NO_NAME, abort: true })
    .refine((name) => name.trim().length <= COLLECTION_NAME_MAX_LENGTH, { error: TOO_LONG, abort: true })
    .pipe(collectionRequestSchema.shape.name),
});

export type CollectionNameFormInput = z.input<typeof collectionNameFormSchema>;
export type CollectionNameFormOutput = z.output<typeof collectionNameFormSchema>;

// Names are unique ignoring case, so the message names the collection the user already has.
export function nameProblem(error: Error, name: string, existing: readonly ListedCollection[] = []): string | null {
  if (isApiError(error, ERROR_CODES.UNAUTHENTICATED)) return null;
  if (!isApiError(error, ERROR_CODES.CONFLICT)) return "Couldn't save the name. Try again.";
  const match = existing.find((collection) => collection.name.toLowerCase() === name.toLowerCase());
  return `You already have ${displayName(match?.name ?? name)}`;
}
