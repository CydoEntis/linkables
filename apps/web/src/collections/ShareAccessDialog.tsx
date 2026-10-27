import { zodResolver } from "@hookform/resolvers/zod";
import { isApiError } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import { SHARE_EMAILS_MAX, type ShareAccess } from "@linkables/shared/sharing";
import { LoaderCircle } from "lucide-react";
import { useId } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field";
import { shareAccessFormSchema, type ShareAccessFormInput } from "./share-access-form";
import { useSetShareAccess, useShareAccess } from "./use-share-access";

type ShareAccessDialogProps = { collectionId: string; open: boolean; onOpenChange: (open: boolean) => void };

export function ShareAccessDialog({ collectionId, open, onOpenChange }: ShareAccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <DialogTitle>Who can see this</DialogTitle>
        <DialogDescription>Choose who the link opens for. People you list get a one-time code by email; they don&apos;t need an account.</DialogDescription>
        {open ? <AccessForm collectionId={collectionId} onDone={() => { onOpenChange(false); }} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function savedMessage({ mode, emails }: ShareAccess): string {
  return mode === "emails" ? `Only ${String(emails.length)} listed ${emails.length === 1 ? "email" : "emails"} can open this` : "Anyone with the link can open this";
}

function problemMessage(error: unknown): string {
  if (isApiError(error, ERROR_CODES.UPSTREAM)) return "Private shares aren't available right now. Try again later.";
  return "Couldn't save that. Try again.";
}

function AccessForm({ collectionId, onDone }: { collectionId: string; onDone: () => void }) {
  const current = useShareAccess(collectionId, true);
  const save = useSetShareAccess(collectionId);
  const form = useForm<ShareAccessFormInput, unknown, ShareAccess>({
    resolver: zodResolver(shareAccessFormSchema),
    defaultValues: { mode: "link", emails: "" },
    ...(current.data ? { values: { mode: current.data.mode, emails: current.data.emails.join("\n") } } : {}),
  });
  const listId = useId();
  const errorId = useId();
  const emailsError = form.formState.errors.emails?.message;
  const privateChosen = form.watch("mode") === "emails";

  if (current.isPending) return <LoaderCircle aria-label="Loading" className="size-5 animate-spin text-muted-foreground" />;
  if (current.isError) return <p role="alert" className="text-sm text-destructive">Couldn&apos;t load who can see this. Close this and try again.</p>;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((access) => {
          save.mutate(access, {
            onSuccess: (saved) => { toast(savedMessage(saved)); onDone(); },
          });
        })(event);
      }}
      className="flex flex-col gap-4"
    >
      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">Who can see this</legend>
        <Choice value="link" label="Anyone with the link" form={form} />
        <Choice value="emails" label="Only these emails" form={form} />
      </fieldset>
      {privateChosen ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={listId} className="text-sm font-semibold">Emails that can open it</label>
          <textarea
            id={listId}
            rows={5}
            placeholder={"sam@example.com\nkim@example.com"}
            aria-invalid={emailsError !== undefined || undefined}
            aria-describedby={emailsError ? errorId : undefined}
            {...form.register("emails")}
            className="w-full resize-y rounded-xl bg-muted px-3.5 py-3 text-base outline-none aria-invalid:shadow-[0_0_0_2px_var(--destructive)] md:text-sm"
          />
          <FieldError id={errorId}>{emailsError}</FieldError>
          <p className="text-[12.5px] text-muted-foreground">One per line or separated by commas, up to {SHARE_EMAILS_MAX}. Each person asks for a code on the link and it works for 12 hours.</p>
        </div>
      ) : null}
      {save.isError ? <p role="alert" className="text-sm text-destructive">{problemMessage(save.error)}</p> : null}
      <Button type="submit" disabled={save.isPending} className="h-11 self-end px-5 font-bold">
        {save.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
        Save
      </Button>
    </form>
  );
}

function Choice({ value, label, form }: { value: ShareAccess["mode"]; label: string; form: ReturnType<typeof useForm<ShareAccessFormInput, unknown, ShareAccess>> }) {
  return (
    <label className="flex min-h-11 items-center gap-3 rounded-xl bg-muted px-3.5 text-[15px] font-semibold has-checked:ring-2 has-checked:ring-ring">
      <input type="radio" value={value} {...form.register("mode")} className="size-4 accent-current" />
      {label}
    </label>
  );
}
