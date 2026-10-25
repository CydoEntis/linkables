import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CONFIRM_WORD, deleteAccountFormSchema, useDeleteAccount, type DeleteAccountForm } from "./use-delete-account";

type DeleteAccountDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Delete your account?</DialogTitle>
        <DialogDescription>
          This deletes every link, note and collection, and turns off your shared links, right away. It can't be undone. Export your links first if
          you want to keep them.
        </DialogDescription>
        {open ? <ConfirmForm onCancel={() => { onOpenChange(false); }} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmForm({ onCancel }: { onCancel: () => void }) {
  const deleteAccount = useDeleteAccount();
  const form = useForm<DeleteAccountForm>({ resolver: zodResolver(deleteAccountFormSchema), defaultValues: { confirm: "" } });
  const error = form.formState.errors.confirm?.message ?? (deleteAccount.isError ? "Couldn't delete your account. Try again." : undefined);

  const inputId = useId();
  const errorId = useId();
  const onSubmit = form.handleSubmit(() => { deleteAccount.mutate(); });

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={inputId}>Type {CONFIRM_WORD} to confirm</FieldLabel>
        <Input
          id={inputId}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-11"
          {...form.register("confirm")}
        />
        <FieldError id={errorId}>{error}</FieldError>
        <FieldDescription>Your sign-in is removed within 30 days.</FieldDescription>
      </Field>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="ghost" size="touch" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="touch" disabled={deleteAccount.isPending} className="bg-destructive-solid font-semibold text-white hover:bg-destructive-solid/90">
          {deleteAccount.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
          Delete account
        </Button>
      </div>
    </form>
  );
}
