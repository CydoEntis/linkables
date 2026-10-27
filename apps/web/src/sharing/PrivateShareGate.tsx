import { zodResolver } from "@hookform/resolvers/zod";
import { SHARE_CODE_EXPIRY_MINUTES, SHARE_CODE_LENGTH, viewerCodeRequestSchema, viewerCodeSchema, type ViewerCodeRequest } from "@linkables/shared/sharing";
import { LoaderCircle, Lock } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { FILLED_FIELD, PRIMARY_BUTTON } from "../auth/SignInLayout";
import { useRequestViewerCode, useVerifyViewerCode, viewerProblem } from "./use-viewer-sign-in";

const codeFormSchema = z.object({ code: viewerCodeSchema });

type CodeForm = z.infer<typeof codeFormSchema>;

function Layout({ title, text, children }: { title: string; text: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[560px] w-full max-w-[400px] animate-fade-up flex-col justify-center gap-5 md:min-h-[600px]">
      <span aria-hidden className="flex size-16 items-center justify-center rounded-[18px] border border-line-strong bg-card text-muted-foreground">
        <Lock className="size-[26px]" />
      </span>
      <div className="flex flex-col gap-2.5">
        <h1 className="text-[26px] font-bold tracking-[-0.02em] text-balance">{title}</h1>
        <p className="text-[15px] leading-[1.55] text-muted-foreground">{text}</p>
      </div>
      {children}
    </div>
  );
}

// Shown when the owner limited this collection to chosen emails and the viewer has no session yet.
export function PrivateShareGate({ token }: { token: string }) {
  const [email, setEmail] = useState<string | null>(null);
  if (email === null) return <EmailStep token={token} onSent={setEmail} />;
  return <CodeStep token={token} email={email} onDifferentEmail={() => { setEmail(null); }} />;
}

function EmailStep({ token, onSent }: { token: string; onSent: (email: string) => void }) {
  const request = useRequestViewerCode(token);
  const form = useForm<ViewerCodeRequest>({ resolver: zodResolver(viewerCodeRequestSchema), defaultValues: { email: "" } });
  const emailId = useId();
  const errorId = useId();
  const error = form.formState.errors.email?.message;

  return (
    <Layout title="This collection is private" text="Enter your email. If the owner shared it with you, we'll email you a 6-digit code.">
      <form
        noValidate
        onSubmit={(event) => {
          void form.handleSubmit((values) => { request.mutate(values, { onSuccess: () => { onSent(values.email); } }); })(event);
        }}
        className="flex flex-col gap-4"
      >
        <Field data-invalid={error !== undefined || undefined} className="gap-2.5">
          <FieldLabel htmlFor={emailId} className="text-sm font-semibold text-foreground">Email</FieldLabel>
          <input
            id={emailId}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={error !== undefined || undefined}
            aria-describedby={error ? errorId : undefined}
            {...form.register("email")}
            className={`${FILLED_FIELD} h-[52px] px-4 text-base`}
          />
          <FieldError id={errorId}>{error}</FieldError>
        </Field>
        {request.isError ? <p role="alert" className="text-sm text-destructive">{viewerProblem(request.error)}</p> : null}
        <button type="submit" disabled={request.isPending} className={PRIMARY_BUTTON}>
          {request.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
          Email me a code
        </button>
      </form>
    </Layout>
  );
}

type CodeStepProps = { token: string; email: string; onDifferentEmail: () => void };

function CodeStep({ token, email, onDifferentEmail }: CodeStepProps) {
  const verify = useVerifyViewerCode(token);
  const again = useRequestViewerCode(token);
  const form = useForm<CodeForm>({ resolver: zodResolver(codeFormSchema), defaultValues: { code: "" } });
  const codeId = useId();
  const messageId = useId();
  const message = form.formState.errors.code?.message ?? (verify.isError ? viewerProblem(verify.error) : undefined);

  return (
    <Layout
      title="Check your email"
      text={
        <>
          If <strong className="break-all text-foreground">{email}</strong> is on the list, we sent a {SHARE_CODE_LENGTH}-digit code. It works once and expires in{" "}
          {SHARE_CODE_EXPIRY_MINUTES} minutes.
        </>
      }
    >
      <form noValidate onSubmit={(event) => { void form.handleSubmit((values) => { verify.mutate({ email, code: values.code }); })(event); }} className="flex flex-col gap-4">
        <Field data-invalid={message !== undefined || undefined} className="gap-2.5">
          <FieldLabel htmlFor={codeId} className="text-sm font-semibold text-foreground">{SHARE_CODE_LENGTH}-digit code</FieldLabel>
          <input
            id={codeId}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            aria-invalid={message !== undefined || undefined}
            aria-describedby={message ? messageId : undefined}
            {...form.register("code", { setValueAs: (value: string) => value.replace(/\D/g, "") })}
            className={`${FILLED_FIELD} h-[60px] px-[18px] font-mono text-[26px] tracking-[0.4em]`}
          />
          <FieldError id={messageId}>{message}</FieldError>
        </Field>
        <button type="submit" disabled={verify.isPending} className={PRIMARY_BUTTON}>
          {verify.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
          Open collection
        </button>
      </form>
      <div className="flex flex-col items-start gap-1">
        <Button variant="ghost" disabled={again.isPending} onClick={() => { again.mutate({ email }); }} className="h-10 px-0 text-[14.5px] text-muted-foreground">
          Send a new code
        </Button>
        <Button variant="ghost" onClick={onDifferentEmail} className="h-10 px-0 text-[14.5px] text-muted-foreground">
          Use a different email
        </Button>
        <p role="status" className="text-sm text-muted-foreground empty:hidden">
          {again.isSuccess ? "If that address is on the list, a new code is on its way." : null}
          {again.isError ? viewerProblem(again.error) : null}
        </p>
      </div>
    </Layout>
  );
}
