import { useMutation } from "@tanstack/react-query";
import { MailCheck } from "lucide-react";
import { useId, useState, type SubmitEvent } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthPage } from "./AuthPage";
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

const emailSchema = z.email();

type SignInScreenProps = { linkProblem: LinkProblem | null; focusHeading: boolean };

export function SignInScreen({ linkProblem, focusHeading }: SignInScreenProps) {
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [cameBack, setCameBack] = useState(false);

  if (sentTo !== null) {
    return <CheckEmail email={sentTo} onUseDifferentEmail={() => {
          setSentTo(null);
          setCameBack(true);
        }} />;
  }
  return <EmailForm
      email={email}
      onEmailChange={setEmail}
      initialProblem={linkProblem}
      onSent={setSentTo}
      focusHeading={focusHeading || cameBack}
    />;
}

type EmailFormProps = {
  email: string;
  onEmailChange: (email: string) => void;
  initialProblem: LinkProblem | null;
  onSent: (email: string) => void;
  focusHeading: boolean;
};

function EmailForm({ email, onEmailChange, initialProblem, onSent, focusHeading }: EmailFormProps) {
  const [problem, setProblem] = useState<Problem | null>(initialProblem);
  const send = useMutation({ mutationFn: sendMagicLink });
  const problemId = useId();

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const address = email.trim();
    if (!emailSchema.safeParse(address).success) {
      setProblem("invalid-email");
      return;
    }
    setProblem(null);
    send.mutate(address, {
      onSuccess: (result) => {
        if (result.ok) onSent(address);
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
      <form noValidate onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => { onEmailChange(event.target.value); }}
            aria-invalid={problem === "invalid-email" || undefined}
            aria-describedby={problem ? problemId : undefined}
            className="h-11"
          />
        </div>
        <p id={problemId} role="alert" className="text-sm text-destructive empty:hidden">
          {problem ? PROBLEM_MESSAGES[problem] : null}
        </p>
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
