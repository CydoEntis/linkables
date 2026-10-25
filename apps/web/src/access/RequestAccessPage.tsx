import { zodResolver } from "@hookform/resolvers/zod";
import { accessRequestSchema, type AccessRequest, type AccessRequestInput } from "@linkables/shared/access";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { FILLED_FIELD, PRIMARY_BUTTON, SignInLayout, StepHeading } from "../auth/SignInLayout";
import { useOnline } from "../auth/use-online";
import { requestProblem, sendAccessRequest } from "./request-access";

type Form = UseFormReturn<AccessRequestInput, unknown, AccessRequest>;

const EMPTY: AccessRequestInput = { email: "", name: "", useCase: "", website: "" };

export function RequestAccessPage() {
  const offline = !useOnline();
  const [sent, setSent] = useState(false);

  return (
    <SignInLayout step={sent ? "sent" : "form"} offline={offline}>
      {sent ? <SentStep /> : <RequestForm offline={offline} onSent={() => { setSent(true); }} />}
    </SignInLayout>
  );
}

function SentStep() {
  return (
    <>
      <StepHeading title="Thanks! We'll email you when there's a spot." description="You can close this page." focus />
      <a href="/" className={PRIMARY_BUTTON}>
        Back to home
      </a>
    </>
  );
}

function RequestForm({ offline, onSent }: { offline: boolean; onSent: () => void }) {
  const form: Form = useForm({ resolver: zodResolver(accessRequestSchema), defaultValues: EMPTY });
  const [problem, setProblem] = useState<string | null>(null);
  const send = useMutation({ mutationFn: sendAccessRequest });

  function submit(request: AccessRequest) {
    setProblem(null);
    send.mutate(request, {
      onSuccess: onSent,
      onError: (error) => {
        const { field, message } = requestProblem(error);
        if (field) form.setError(field, { message }, { shouldFocus: true });
        else setProblem(message);
      },
    });
  }

  return (
    <>
      <StepHeading
        title="Request access"
        description="linkables is in private beta. Leave your email and we'll send you an invite when there's a spot."
      />
      <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)} className="flex flex-col gap-5">
        <TextField form={form} name="email" label="Email" type="email" autoComplete="email" required placeholder="you@example.com" />
        <TextField form={form} name="name" label="Name (optional)" autoComplete="name" />
        <TextField form={form} name="useCase" label="What would you use it for? (optional)" multiline />
        <Honeypot form={form} />
        {problem ? (
          <p role="alert" className="text-sm text-destructive">
            {problem}
          </p>
        ) : null}
        <button type="submit" disabled={offline || send.isPending} className={PRIMARY_BUTTON}>
          {send.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
          {send.isPending ? "Sending…" : "Request access"}
        </button>
        <p role="status" className="sr-only">
          {send.isPending ? "Sending your request" : null}
        </p>
      </form>
    </>
  );
}

type TextFieldProps = {
  form: Form;
  name: "email" | "name" | "useCase";
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  multiline?: boolean;
};

function TextField({ form, name, label, multiline = false, ...input }: TextFieldProps) {
  const id = useId();
  const errorId = useId();
  const error = form.formState.errors[name]?.message;
  const shared = {
    id,
    ...form.register(name),
    "aria-invalid": error !== undefined || undefined,
    "aria-describedby": error ? errorId : undefined,
  };

  return (
    <Field data-invalid={error !== undefined || undefined} className="gap-2.5">
      <FieldLabel htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </FieldLabel>
      {multiline ? (
        <textarea {...shared} rows={4} className={cn(FILLED_FIELD, "resize-y px-4 py-3.5 text-base")} />
      ) : (
        <input {...shared} {...input} className={cn(FILLED_FIELD, "h-[52px] px-4 text-base")} />
      )}
      <FieldError id={errorId}>{error}</FieldError>
    </Field>
  );
}

// Off-screen rather than display:none, which some bots skip. People never reach it:
// it is hidden from assistive tech and out of the tab order.
function Honeypot({ form }: { form: Form }) {
  return (
    <div aria-hidden className="absolute -left-[9999px] size-px overflow-hidden">
      <input type="text" tabIndex={-1} autoComplete="off" {...form.register("website")} />
    </div>
  );
}
