import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { AuthPage } from "./AuthPage";
import { useAuthState } from "./auth-state";
import type { LinkProblem } from "./link-landing";
import { sendMagicLink, type SendLinkProblem } from "./magic-link";

type Problem = SendLinkProblem | LinkProblem;

const PROBLEM_MESSAGES: Record<Problem, string> = {
  "invalid-email": "Enter a valid email address.",
  "rate-limited": "Too many sign-in emails. Wait a bit and try again.",
  offline: "You're offline. Connect to the internet and try again.",
  "not-allowed": "This email can't sign in to linkables.",
  failed: "We couldn't send the link. Try again.",
  expired: "This link has expired. Send a new one.",
  invalid: "This sign-in link didn't work. Send a new one.",
};

const signInSchema = z.object({
  email: z.string().trim().pipe(z.email({ error: PROBLEM_MESSAGES["invalid-email"] })),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInPage() {
  const auth = useAuthState();
  if (auth.status !== "signed-out") return null;
  return <SignInScreen linkProblem={auth.linkProblem} focusHeading={auth.afterSignOut} />;
}

type SignInScreenProps = { linkProblem: LinkProblem | null; focusHeading: boolean };

export function SignInScreen({ linkProblem, focusHeading }: SignInScreenProps) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cameBack, setCameBack] = useState(false);

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
    <EmailForm
      defaultEmail={email}
      initialProblem={linkProblem}
      onSent={(address) => {
        setEmail(address);
        setSentTo(address);
      }}
      focusHeading={focusHeading || cameBack}
    />
  );
}

type EmailFormProps = {
  defaultEmail: string;
  initialProblem: LinkProblem | null;
  onSent: (email: string) => void;
  focusHeading: boolean;
};

function EmailForm({ defaultEmail, initialProblem, onSent, focusHeading }: EmailFormProps) {
  const [problem, setProblem] = useState<Problem | null>(initialProblem);
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
    <AuthPage
      title="Sign in to linkables"
      description="We'll email you a link that signs you in."
      focusHeading={focusHeading}
    >
      <form noValidate onSubmit={(event) => void form.handleSubmit(submit)(event)} className="space-y-4">
        <Field data-invalid={invalid || undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
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
    </AuthPage>
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
