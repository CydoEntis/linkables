import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { pendingSaveHref } from "../save/pending-save";
import { AuthPage } from "./AuthPage";
import { useAuthState } from "./auth-state";
import { GoogleMark } from "./GoogleMark";
import { signInWithGoogle } from "./google-sign-in";
import type { LinkProblem } from "./link-landing";
import { sendMagicLink, type SendLinkProblem } from "./magic-link";

type Problem = SendLinkProblem | LinkProblem;
type EmailProblem = Exclude<Problem, "google-failed">;

const PROBLEM_MESSAGES: Record<Problem, string> = {
  "invalid-email": "Enter a valid email address.",
  "rate-limited": "Too many sign-in emails. Wait a bit and try again.",
  offline: "You're offline. Connect to the internet and try again.",
  "not-allowed": "This email can't sign in to linkables.",
  failed: "We couldn't send the link. Try again.",
  expired: "This link has expired. Send a new one.",
  invalid: "This sign-in link didn't work. Send a new one.",
  "google-failed": "Google sign-in didn't finish. Try again.",
};

const signInSchema = z.object({
  email: z.string().trim().pipe(z.email({ error: PROBLEM_MESSAGES["invalid-email"] })),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInPage() {
  const auth = useAuthState();
  if (auth.status !== "signed-out") return null;
  return (
    <SignInScreen
      linkProblem={auth.linkProblem}
      focusHeading={auth.afterSignOut}
      title={pendingSaveHref() ? "Sign in to save this link" : undefined}
    />
  );
}

type SignInScreenProps = { linkProblem: LinkProblem | null; focusHeading: boolean; title?: string | undefined };

export function SignInScreen({ linkProblem, focusHeading, title = "Sign in to linkables" }: SignInScreenProps) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cameBack, setCameBack] = useState(false);
  const [emailChosen, setEmailChosen] = useState(false);
  const emailLinkProblem = linkProblem === "google-failed" ? null : linkProblem;

  if (sentTo !== null) {
    return (
      <CheckEmail
        email={sentTo}
        onUseDifferentEmail={() => {
          setSentTo(null);
          setCameBack(true);
        }}
      />
    );
  }
  return (
    <AuthPage title={title} description="Sign in to save and find your links." focusHeading={focusHeading || cameBack}>
      <div className="space-y-4">
        <GoogleSignIn initialProblem={linkProblem === "google-failed" ? linkProblem : null} />
        {emailChosen || cameBack || emailLinkProblem !== null ? (
          <EmailForm
            defaultEmail={email}
            initialProblem={emailLinkProblem}
            focusEmail={emailChosen && !cameBack}
            onSent={(address) => {
              setEmail(address);
              setSentTo(address);
            }}
          />
        ) : (
          <Button variant="ghost" onClick={() => { setEmailChosen(true); }} className="h-11 w-full">
            Use email instead
          </Button>
        )}
      </div>
    </AuthPage>
  );
}

function GoogleSignIn({ initialProblem }: { initialProblem: "google-failed" | null }) {
  const start = useMutation({ mutationFn: signInWithGoogle });
  const result = start.isError ? ({ ok: false, problem: "google-failed" } as const) : start.data;
  const problem = result ? (result.ok ? null : result.problem) : initialProblem;

  return (
    <div className="space-y-2">
      {problem ? (
        <p role="alert" className="text-sm text-destructive">
          {PROBLEM_MESSAGES[problem]}
        </p>
      ) : null}
      <Button disabled={start.isPending} onClick={() => { start.mutate(); }} className="h-11 w-full">
        <GoogleMark />
        Continue with Google
      </Button>
    </div>
  );
}

type EmailFormProps = {
  defaultEmail: string;
  initialProblem: EmailProblem | null;
  focusEmail: boolean;
  onSent: (email: string) => void;
};

function EmailForm({ defaultEmail, initialProblem, focusEmail, onSent }: EmailFormProps) {
  const [problem, setProblem] = useState<EmailProblem | null>(initialProblem);
  const send = useMutation({ mutationFn: sendMagicLink });
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: defaultEmail } });
  const problemId = useId();
  const emailError = form.formState.errors.email?.message;
  const invalid = emailError !== undefined || problem === "invalid-email";
  const message = emailError ?? (problem ? PROBLEM_MESSAGES[problem] : null);

  function submit({ email }: SignInValues) {
    setProblem(null);
    send.mutate(email, {
      onSuccess: (result) => {
        if (result.ok) onSent(email);
        else setProblem(result.problem);
      },
      onError: () => { setProblem("failed"); },
    });
  }

  return (
    <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)} className="space-y-4">
      <Field data-invalid={invalid || undefined}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          autoFocus={focusEmail}
          {...form.register("email")}
          aria-invalid={invalid || undefined}
          aria-describedby={message ? problemId : undefined}
          className="h-11"
        />
        <FieldError id={problemId}>{message}</FieldError>
      </Field>
      <Button type="submit" disabled={send.isPending} className="h-11 w-full">
        {send.isPending ? "Sending…" : "Email me a sign-in link"}
      </Button>
      <p role="status" className="sr-only">
        {send.isPending ? "Sending the sign-in link" : null}
      </p>
    </form>
  );
}

function CheckEmail({ email, onUseDifferentEmail }: { email: string; onUseDifferentEmail: () => void }) {
  const resend = useMutation({ mutationFn: sendMagicLink });
  const result = resend.isError ? ({ ok: false, problem: "failed" } as const) : resend.data;

  return (
    <AuthPage
      icon={<MailCheck aria-hidden className="size-8 text-muted-foreground" />}
      title="Check your email"
      focusHeading
      description={
        <>
          We sent a sign-in link to <strong className="break-all text-foreground">{email}</strong>.
        </>
      }
    >
      <div className="space-y-4">
        <p role="status" className="text-sm text-muted-foreground empty:hidden">
          {resend.isPending ? "Sending…" : result?.ok ? "Sent another link." : null}
        </p>
        <p role="alert" className="text-sm text-destructive empty:hidden">
          {result && !result.ok ? PROBLEM_MESSAGES[result.problem] : null}
        </p>
        <Button
          variant="outline"
          disabled={resend.isPending}
          onClick={() => { resend.mutate(email); }}
          className="h-11 w-full"
        >
          Resend
        </Button>
        <Button variant="ghost" onClick={onUseDifferentEmail} className="h-11 w-full">
          Use a different email
        </Button>
      </div>
    </AuthPage>
  );
}
