import { zodResolver } from "@hookform/resolvers/zod";
import type { SubmitEvent } from "react";
import { useForm } from "react-hook-form";
import {
  collectionNameFormSchema,
  nameProblem,
  type CollectionNameFormInput,
  type CollectionNameFormOutput,
} from "./collection-name-form";
import { useCollections } from "./use-collections";

type CollectionNameFormOptions = {
  defaultName?: string;
  save: (name: string) => Promise<unknown>;
};

// Create and rename share this: validate with the shared rule, then show a 409 as "You already have X".
export function useCollectionNameForm({ defaultName = "", save }: CollectionNameFormOptions) {
  const { data: collections } = useCollections();
  const form = useForm<CollectionNameFormInput, unknown, CollectionNameFormOutput>({
    resolver: zodResolver(collectionNameFormSchema),
    defaultValues: { name: defaultName },
  });

  const submitValid = form.handleSubmit(async ({ name }) => {
    try {
      await save(name);
    } catch (error) {
      if (!(error instanceof Error)) throw error;
      const message = nameProblem(error, name, collections);
      if (message) form.setError("name", { message });
    }
  });

  function onSubmit(event?: SubmitEvent<HTMLFormElement>) {
    event?.preventDefault();
    void submitValid();
  }

  return {
    register: form.register,
    onSubmit,
    reset: form.reset,
    error: form.formState.errors.name?.message,
    isSubmitting: form.formState.isSubmitting,
  };
}
