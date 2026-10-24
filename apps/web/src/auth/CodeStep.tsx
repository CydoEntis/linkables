import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { Mail } from "lucide-react";
import { useId, useState } from "react";
import { useController, useForm } from "react-hook-form";
import { z } from "zod";
import { CODE_LENGTH, toCodeDigits, verifyEmailCode, type VerifyCodeProblem } from "./email-code";
import { sendMagicLink } from "./magic-link";
import { PROBLEM_MESSAGES } from "./sign-in-messages";
import { FILLED_FIELD, StepHeading } from "./SignInLayout";
import { useCountdown } from "./use-countdown";
import { useShake } from "./use-shake";

// Supabase allows one email per address every 60 s by default.
const RESEND_WAIT_SECONDS = 60;

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code from the email." }),
});

type CodeValues = z.infer<typeof codeSchema>;

type CodeStepProps = { email: string; offline: boolean; onUseDifferentEmail: () => void };

export function CodeStep({ email, offline, onUseDifferentEmail }: CodeStepProps) {
  return (
    <>
      <div className="flex size-14 animate-spring items-center justify-center rounded-2xl bg-muted">
        <Mail aria-hidden className="size-6" />
      </div>
      <StepHeading
        title="Check your email"
        focus
        description={
          <>
            We sent a sign-in link and a code to <strong className="break-all text-foreground">{email}</strong>. Open the
            link, or type the code here.
          </>
        }
      />
      <CodeForm email={email} />
      <Resend email={email} offline={offline} />
      <button
        type="button"
        onClick={onUseDifferentEmail}
        className="h-9 self-start text-[14.5px] text-muted-foreground hover:text-foreground"
      >
        Use a different email
      </button>
      <p className="text-[13.5px] leading-normal text-subtle-foreground">
        Can't find it? Check spam. The link and code work for an hour.
      </p>
    </>
  );
}

function CodeForm({ email }: { email: string }) {
  const [problem, setProblem] = useState<VerifyCodeProblem | null>(null);
  const verify = useMutation({ mutationFn: (code: string) => verifyEmailCode(email, code) });
  const form = useForm<CodeValues>({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } });
  const { field, fieldState } = useController({ control: form.control, name: "code" });
  const { shake, fieldProps } = useShake();
  const inputId = useId();
  const messageId = useId();
  const message = fieldState.error?.message ?? (problem ? PROBLEM_MESSAGES[problem] : null);

  const submit = form.handleSubmit(({ code }) => {
    setProblem(null);
    verify.mutate(code, {
      onSuccess: (result) => {
        if (result.ok) return;
        setProblem(result.problem);
        shake();
      },
      onError: () => { setProblem("failed"); },
    });
  }, shake);

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-semibold">
        6-digit code
      </label>
      {/* No maxLength: a pasted "123 456" must arrive whole so the space can be dropped. */}
      <input
        id={inputId}
        ref={field.ref}
        name={field.name}
        value={field.value}
        onBlur={field.onBlur}
        onChange={(event) => {
          const digits = toCodeDigits(event.target.value);
          field.onChange(digits);
          setProblem(null);
          if (digits.length === CODE_LENGTH) void submit();
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        readOnly={verify.isPending}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        {...fieldProps}
        className={cn(FILLED_FIELD, "h-[60px] px-[18px] font-mono text-[26px] tracking-[0.4em]")}
      />
      {message ? (
        <p id={messageId} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <p role="status" className="sr-only">
        {verify.isPending ? "Checking the code" : null}
      </p>
    </form>
  );
}

function Resend({ email, offline }: { email: string; offline: boolean }) {
  const countdown = useCountdown(RESEND_WAIT_SECONDS);
  const resend = useMutation({
    mutationFn: sendMagicLink,
    onSuccess: (result) => { if (result.ok) countdown.restart(); },
  });
  const result = resend.isError ? ({ ok: false, problem: "failed" } as const) : resend.data;
  const waiting = countdown.secondsLeft > 0;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={offline || waiting || resend.isPending}
        onClick={() => { resend.mutate(email); }}
        className="h-[52px] rounded-xl bg-muted text-[15px] font-semibold transition-colors hover:bg-accent disabled:cursor-default disabled:text-subtle-foreground disabled:hover:bg-muted"
      >
        {resend.isPending ? "Sending…" : waiting ? `Resend in ${String(countdown.secondsLeft)}s` : "Resend"}
      </button>
      <p role="status" className="text-sm text-muted-foreground empty:hidden">
        {result?.ok ? "Sent another email." : null}
      </p>
      {result && !result.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {PROBLEM_MESSAGES[result.problem]}
        </p>
      ) : null}
    </div>
  );
}
