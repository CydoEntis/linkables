import { zodResolver } from "@hookform/resolvers/zod";
import type { SubmitEvent } from "react";
import { useForm } from "react-hook-form";
import { saveLinkFormSchema, type SaveLinkFormInput, type SaveLinkFormOutput } from "./save-link-form";
import { useSaveLink } from "./use-save-link";

// The search bar passes "onSubmit": its text is often a search, which must not be checked as a link while typing.
type SaveLinkFormOptions = {
  onSubmitted?: () => void;
  onInvalid?: () => void;
  reValidateMode?: "onChange" | "onSubmit";
  defaultUrl?: string | undefined;
};

// Saving is optimistic: the field clears at once, and a link the API rejects comes back with its message.
export function useSaveLinkForm({ onSubmitted, onInvalid, reValidateMode = "onChange", defaultUrl = "" }: SaveLinkFormOptions = {}) {
  const save = useSaveLink();
  const form = useForm<SaveLinkFormInput, unknown, SaveLinkFormOutput>({
    resolver: zodResolver(saveLinkFormSchema),
    defaultValues: { url: defaultUrl },
    reValidateMode,
  });
  const value = form.watch("url");

  const submitValid = form.handleSubmit(({ url }) => {
    form.reset({ url: "" });
    onSubmitted?.();
    save(url, {
      onInvalid: (message) => {
        form.setValue("url", url);
        form.setError("url", { message });
        onInvalid?.();
      },
    });
  });

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim() !== "") void submitValid(event);
  }

  return {
    register: form.register,
    onSubmit,
    value,
    setValue: (text: string) => { form.setValue("url", text); },
    clearError: () => { form.clearErrors("url"); },
    canSave: saveLinkFormSchema.safeParse({ url: value }).success,
    error: form.formState.errors.url?.message,
  };
}
