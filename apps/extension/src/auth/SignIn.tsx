import { zodResolver } from "@hookform/resolvers/zod";
import { EXTENSION_CONNECT_PATH } from "@linkables/shared/extension-sessions";
import { BUTTON_DARK } from "@linkables/shared/ui";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useController, useForm } from "react-hook-form";
import { z } from "zod";
import { env } from "../config/env";
import { Alert, FILLED_FIELD, OfflineNote, PRIMARY_BUTTON, QUIET_LINK, Wordmark } from "../ui";
import { CODE_LENGTH, sendCode, SIGN_IN_MESSAGES, toCodeDigits, verifyCode, type SendCodeProblem, type VerifyCodeProblem } from "./email-code";
import { askWorkerForGoogle, GOOGLE_MESSAGES } from "./google-sign-in";
import { GoogleMark } from "./GoogleMark";
import { forgetCode, pendingCode, rememberCodeSent, type PendingCode } from "./pending-code";
import { useCountdown } from "./use-countdown";
import { useOnline } from "./use-online";

// Supabase allows one email per address every 60 s by default (docs/supabase-email-templates.md).
const RESEND_WAIT_SECONDS = 60;

const emailSchema = z.object({
  email: z.string().trim().pipe(z.email({ error: SIGN_IN_MESSAGES["invalid-email"] })),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, { error: "Enter the 6-digit code from the email." }),
});

// undefined while the stored pending code is being read, so the email step never flashes first.
function usePendingCode() {
  const [pending, setPending] = useState<PendingCode | null | undefined>(undefined);
  useEffect(() => {
    let current = true;
    void pendingCode(chrome.storage.session, Date.now()).then((stored) => {
      if (current) setPending(stored);
    });
    return () => { current = false; };
  }, []);

  function sent(email: string) {
    const next = { email, sentAt: Date.now() };
    setPending(next);
    void rememberCodeSent(chrome.storage.session, next);
  }

  // Signed in, the pop-up moves on by itself, so only the stored copy goes.
  function signedIn() {
    void forgetCode(chrome.storage.session);
  }

  function startOver() {
    setPending(null);
    signedIn();
  }

  return { pending, sent, signedIn, startOver };
}

export function SignIn() {
  const offline = !useOnline();
  const { pending, sent, signedIn, startOver } = usePendingCode();
  const [useEmail, setUseEmail] = useState(false);
  return (
    <main className="flex flex-col gap-4 p-5">
      <Wordmark />
      {offline ? <OfflineNote /> : null}
      {pending === undefined ? null : pending === null ? (
        useEmail ? (
          <EmailStep offline={offline} onSent={sent} onOtherWays={() => { setUseEmail(false); }} />
        ) : (
          <ChooseStep offline={offline} onUseEmail={() => { setUseEmail(true); }} />
        )
      ) : (
        <CodeStep pending={pending} offline={offline} onSent={sent} onSignedIn={signedIn} onUseDifferentEmail={startOver} />
      )}
    </main>
  );
}

function Heading({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex animate-rise flex-col gap-1">
      <h1 className="text-[18px] font-bold">{title}</h1>
      <p className="text-[13px] leading-snug text-muted-foreground">{children}</p>
    </div>
  );
}

// The connect page signs the extension in with the account already signed in on
// linkables.app (src/connect); the worker closes its tab once that is done.
function openConnectPage() {
  void chrome.tabs.create({ url: env.VITE_APP_URL.replace(/\/+$/, "") + EXTENSION_CONNECT_PATH });
}

const GOOGLE_BUTTON = cn(
  BUTTON_DARK,
  "flex h-11 w-full items-center justify-center gap-2.5 rounded-xl bg-foreground text-[14.5px] font-bold text-background hover:brightness-95 disabled:cursor-default disabled:opacity-50",
);

function ChooseStep({ offline, onUseEmail }: { offline: boolean; onUseEmail: () => void }) {
  const google = useMutation({ mutationFn: askWorkerForGoogle });
  const result = google.isError ? ({ ok: false, problem: "failed" } as const) : google.data;
  return (
    <>
      <Heading title="Sign in to save this page">Use the account you have on linkables.app.</Heading>
      <div className="flex flex-col gap-2">
        <button type="button" disabled={offline} onClick={openConnectPage} className={PRIMARY_BUTTON}>
          Sign in with linkables.app
        </button>
        <button type="button" disabled={offline || google.isPending} onClick={() => { google.mutate(); }} className={GOOGLE_BUTTON}>
          {google.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <GoogleMark />}
          Continue with Google
        </button>
        {result && !result.ok ? <Alert>{GOOGLE_MESSAGES[result.problem]}</Alert> : null}
      </div>
      <button type="button" onClick={onUseEmail} className={cn(QUIET_LINK, "self-start")}>
        Use an email code instead
      </button>
    </>
  );
}

type EmailStepProps = { offline: boolean; onSent: (email: string) => void; onOtherWays: () => void };

function EmailStep({ offline, onSent, onOtherWays }: EmailStepProps) {
  const [problem, setProblem] = useState<SendCodeProblem | null>(null);
  const send = useMutation({ mutationFn: sendCode });
  const form = useForm({ resolver: zodResolver(emailSchema), defaultValues: { email: "" } });
  const inputId = useId();
  const messageId = useId();
  const message = form.formState.errors.email?.message ?? (problem ? SIGN_IN_MESSAGES[problem] : null);

  const submit = form.handleSubmit(({ email }) => {
    setProblem(null);
    send.mutate(email, {
      onSuccess: (result) => {
        if (result.ok) onSent(email);
        else setProblem(result.problem);
      },
      onError: () => { setProblem("failed"); },
    });
  });

  return (
    <>
      <Heading title="Sign in to save this page">We'll email you a 6-digit code.</Heading>
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-[13px] font-semibold">
          Email
        </label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          autoFocus
          {...form.register("email")}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(FILLED_FIELD, "h-11 px-3.5 text-[14.5px]")}
        />
        {message ? <span id={messageId}><Alert>{message}</Alert></span> : null}
        <button type="submit" disabled={offline || send.isPending} className={cn(PRIMARY_BUTTON, "mt-1")}>
          {send.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
          {send.isPending ? "Sending…" : "Email me a code"}
        </button>
      </form>
      <button type="button" onClick={onOtherWays} className={cn(QUIET_LINK, "self-start")}>
        Other ways to sign in
      </button>
    </>
  );
}

type CodeStepProps = {
  pending: PendingCode;
  offline: boolean;
  onSent: (email: string) => void;
  onSignedIn: () => void;
  onUseDifferentEmail: () => void;
};

function CodeStep({ pending, offline, onSent, onSignedIn, onUseDifferentEmail }: CodeStepProps) {
  const { email } = pending;
  return (
    <>
      <Heading title="Check your email">
        We sent a code to <strong className="break-all text-foreground">{email}</strong>.
      </Heading>
      <CodeForm email={email} onSignedIn={onSignedIn} />
      <Resend email={email} sentAt={pending.sentAt} offline={offline} onSent={onSent} />
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onUseDifferentEmail} className={QUIET_LINK}>
          Use a different email
        </button>
        <span className="text-[12px] text-subtle-foreground">Can't find it? Check spam.</span>
      </div>
    </>
  );
}

function CodeForm({ email, onSignedIn }: { email: string; onSignedIn: () => void }) {
  const [problem, setProblem] = useState<VerifyCodeProblem | null>(null);
  const verify = useMutation({ mutationFn: (code: string) => verifyCode(email, code) });
  const form = useForm({ resolver: zodResolver(codeSchema), defaultValues: { code: "" } });
  const { field, fieldState } = useController({ control: form.control, name: "code" });
  // Refs, not state: a second submit can arrive before the re-render that marks the first.
  const checking = useRef(false);
  const lastSent = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();
  const messageId = useId();
  const message = fieldState.error?.message ?? (problem ? SIGN_IN_MESSAGES[problem] : null);

  // A right code signs in, and the pop-up moves on to saving by itself.
  const submit = form.handleSubmit(({ code }) => {
    if (checking.current) return;
    checking.current = true;
    lastSent.current = code;
    setProblem(null);
    verify.mutate(code, {
      onSuccess: (result) => {
        if (result.ok) {
          onSignedIn();
          return;
        }
        setProblem(result.problem);
        inputRef.current?.select();
      },
      onError: () => { setProblem("failed"); },
      onSettled: () => { checking.current = false; },
    });
  });

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-[13px] font-semibold">
        6-digit code
      </label>
      {/* No maxLength: a pasted "123 456" must arrive whole so the space can be dropped. */}
      <input
        id={inputId}
        ref={(element) => {
          field.ref(element);
          inputRef.current = element;
        }}
        name={field.name}
        value={field.value}
        onBlur={field.onBlur}
        onChange={(event) => {
          const digits = toCodeDigits(event.target.value);
          field.onChange(digits);
          setProblem(null);
          if (digits.length === CODE_LENGTH && digits !== lastSent.current) void submit();
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        autoFocus
        readOnly={verify.isPending}
        aria-invalid={message ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(FILLED_FIELD, "h-[52px] px-4 font-mono text-[22px] tracking-[0.4em]")}
      />
      {message ? <span id={messageId}><Alert>{message}</Alert></span> : null}
      <p role="status" className="sr-only">
        {verify.isPending ? "Checking the code" : null}
      </p>
    </form>
  );
}

type ResendProps = { email: string; sentAt: number; offline: boolean; onSent: (email: string) => void };

function Resend({ email, sentAt, offline, onSent }: ResendProps) {
  const countdown = useCountdown(RESEND_WAIT_SECONDS, sentAt);
  const resend = useMutation({
    mutationFn: sendCode,
    onSuccess: (result) => {
      if (!result.ok) return;
      countdown.restart();
      onSent(email);
    },
  });
  const result = resend.isError ? ({ ok: false, problem: "failed" } as const) : resend.data;
  const waiting = countdown.secondsLeft > 0;

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={offline || waiting || resend.isPending}
        onClick={() => { resend.mutate(email); }}
        className={cn(BUTTON_DARK, "h-10 rounded-[10px] bg-muted text-[13.5px] hover:bg-accent disabled:cursor-default disabled:text-subtle-foreground disabled:hover:bg-muted")}
      >
        {resend.isPending ? "Sending…" : waiting ? `Resend in ${String(countdown.secondsLeft)}s` : "Resend the code"}
      </button>
      <p role="status" className="text-[12.5px] text-muted-foreground empty:hidden">
        {result?.ok ? "Sent another email." : null}
      </p>
      {result && !result.ok ? <Alert>{SIGN_IN_MESSAGES[result.problem]}</Alert> : null}
    </div>
  );
}
