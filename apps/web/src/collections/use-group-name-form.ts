import { zodResolver } from "@hookform/resolvers/zod";
import { isApiError } from "@linkables/shared/api-client";
import { COLLECTION_GROUPS_MAX, GROUP_NAME_MAX_LENGTH, groupRequestSchema } from "@linkables/shared/groups";
import { ERROR_CODES } from "@linkables/shared/http";
import type { SubmitEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const NO_NAME = "Give it a name";
const TOO_LONG = `Names can be up to ${String(GROUP_NAME_MAX_LENGTH)} characters`;
export const DUPLICATE_GROUP = "You already have a group with that name";
export const GROUP_LIMIT = `A collection can have up to ${String(COLLECTION_GROUPS_MAX)} groups`;

// Built on the API's own name rule; the first checks only swap in friendlier copy.
const groupNameFormSchema = z.object({
  name: z
    .string()
    .refine((name) => name.trim() !== "", { error: NO_NAME, abort: true })
    .refine((name) => name.trim().length <= GROUP_NAME_MAX_LENGTH, { error: TOO_LONG, abort: true })
    .pipe(groupRequestSchema.shape.name),
});

type Input = z.input<typeof groupNameFormSchema>;
type Output = z.output<typeof groupNameFormSchema>;

type GroupNameFormOptions = {
  defaultName?: string;
  // True when the collection already has the most groups: the API answers that and a duplicate name both with CONFLICT, so the cap is told apart here.
  atLimit?: boolean;
  save: (name: string) => Promise<unknown>;
};

export function useGroupNameForm({ defaultName = "", atLimit = false, save }: GroupNameFormOptions) {
  const form = useForm<Input, unknown, Output>({ resolver: zodResolver(groupNameFormSchema), defaultValues: { name: defaultName } });

  const submitValid = form.handleSubmit(async ({ name }) => {
    if (atLimit) {
      form.setError("name", { message: GROUP_LIMIT });
      return;
    }
    try {
      await save(name);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      if (isApiError(error, ERROR_CODES.UNAUTHENTICATED)) return;
      form.setError("name", { message: isApiError(error, ERROR_CODES.CONFLICT) ? DUPLICATE_GROUP : "Couldn't save the name. Try again." });
    }
  });

  function onSubmit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    void submitValid();
  }

  return { register: form.register, onSubmit, error: form.formState.errors.name?.message, isSubmitting: form.formState.isSubmitting };
}
