import { zodResolver } from "@hookform/resolvers/zod";
import { Link2Off, LoaderCircle, Trash2, UserRound, X } from "lucide-react";
import { useId, useRef, type ReactNode, type RefObject } from "react";
import { useForm } from "react-hook-form";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useExportLinks } from "../export/use-export-links";
import { useWideScreen } from "../shell/use-wide-screen";
import { CONFIRM_WORD, deleteAccountFormSchema, useDeleteAccount, type DeleteAccountForm } from "./use-delete-account";

type DeleteAccountDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

// A dialog on a wide screen, a bottom sheet on a phone; the same confirm in both.
export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const wide = useWideScreen();
  const confirmRef = useRef<HTMLInputElement>(null);
  const body = open ? <DeleteAccountBody confirmRef={confirmRef} onCancel={() => { onOpenChange(false); }} /> : null;
  if (wide) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent initialFocus={confirmRef} className="max-w-[480px] p-[26px] duration-240 ease-out-soft data-ending-style:translate-y-[calc(-50%+8px)] data-ending-style:scale-98 data-starting-style:translate-y-[calc(-50%+8px)] data-starting-style:scale-98">
          {body}
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent initialFocus={confirmRef} className="max-h-[92svh] overflow-y-auto rounded-t-[26px] px-5 pt-[22px] pb-[max(40px,env(safe-area-inset-bottom))] duration-320">
        {body}
      </SheetContent>
    </Sheet>
  );
}

type BodyProps = { confirmRef: RefObject<HTMLInputElement | null>; onCancel: () => void };

function DeleteAccountBody({ confirmRef, onCancel }: BodyProps) {
  const exportLinks = useExportLinks();
  return (
    <>
      <span aria-hidden className="flex size-11 items-center justify-center rounded-xl bg-destructive/14 text-destructive">
        <Trash2 className="size-5" />
      </span>
      <DialogTitle className="text-[21px] tracking-[-0.01em]">Delete your account?</DialogTitle>
      <ul className="flex flex-col gap-2.5 rounded-[14px] bg-muted px-4 py-3.5 text-[14px] leading-[1.45] text-soft-foreground">
        <Consequence icon={<X className="text-destructive" strokeWidth={2.4} />}>Your links, collections and every note are deleted right away.</Consequence>
        <Consequence icon={<Link2Off className="text-destructive" />}>Your shared links stop working.</Consequence>
        <Consequence icon={<UserRound className="text-muted-foreground" />}>Your sign-in record is removed within 30 days.</Consequence>
      </ul>
      <p className="text-[13.5px] text-muted-foreground">
        Want a copy first?{" "}
        <button type="button" onClick={() => void exportLinks()} className="font-bold text-foreground underline underline-offset-3">
          Export my links
        </button>
      </p>
      <ConfirmForm confirmRef={confirmRef} onCancel={onCancel} />
    </>
  );
}

function Consequence({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span aria-hidden className="mt-0.5 shrink-0 [&_svg]:size-4">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

function ConfirmForm({ confirmRef, onCancel }: BodyProps) {
  const deleteAccount = useDeleteAccount();
  const form = useForm<DeleteAccountForm>({ resolver: zodResolver(deleteAccountFormSchema), defaultValues: { confirm: "" } });
  const matches = deleteAccountFormSchema.safeParse({ confirm: form.watch("confirm") }).success;
  const error = form.formState.errors.confirm?.message ?? (deleteAccount.isError ? "Couldn't delete your account. Try again." : undefined);

  const inputId = useId();
  const errorId = useId();
  const field = form.register("confirm");
  const onSubmit = form.handleSubmit(() => { deleteAccount.mutate(); });

  return (
    <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
      <Field data-invalid={error ? true : undefined}>
        <FieldLabel htmlFor={inputId} className="text-[13.5px] font-semibold">
          Type {CONFIRM_WORD} to confirm
        </FieldLabel>
        <Input
          id={inputId}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder={CONFIRM_WORD}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-12 rounded-xl border-line-strong bg-background px-3.5 font-mono text-base tracking-[0.14em] transition-colors",
            matches && "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40",
          )}
          {...field}
          ref={(element) => {
            field.ref(element);
            confirmRef.current = element;
          }}
          onChange={(event) => {
            event.target.value = event.target.value.toUpperCase();
            void field.onChange(event);
          }}
        />
        <FieldError id={errorId}>{error}</FieldError>
      </Field>
      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button type="button" variant="ghost" className="h-[46px] px-[18px] text-[14.5px] font-bold" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!matches || deleteAccount.isPending}
          className={cn(
            "h-[46px] px-[18px] text-[14.5px] font-bold disabled:opacity-100",
            matches ? "bg-destructive text-[#1f0a07] hover:brightness-105" : "bg-muted text-subtle-foreground inset-shadow-none",
          )}
        >
          {deleteAccount.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
          {deleteAccount.isPending ? "Deleting…" : "Delete account"}
        </Button>
      </div>
    </form>
  );
}
