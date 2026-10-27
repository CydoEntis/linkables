import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { INVITE_ONLY, REQUEST_ACCESS_PATH } from "../config/access";
import { pendingSaveHref } from "../save/pending-save";
import { useAuthState } from "./auth-state";
import { CodeStep } from "./CodeStep";
import { GoogleMark } from "./GoogleMark";
import { signInWithGoogle } from "./google-sign-in";
import type { LinkProblem } from "./link-landing";
import { sendMagicLink, type SendLinkProblem } from "./magic-link";
import { PROBLEM_MESSAGES } from "./sign-in-messages";
import { FILLED_FIELD, PRIMARY_BUTTON, SignInLayout, StepHeading } from "./SignInLayout";
import { useOnline } from "./use-online";
import { useShake } from "./use-shake";

const signInSchema = z.object({
  email: z.string().trim().pipe(z.email({ error: PROBLEM_MESSAGES["invalid-email"] })),
});

type SignInValues = z.infer<typeof signInSchema>;

type Step = "start" | "sent" | "expired";
// What to focus when the start step comes back from another step.
type StartFocus = "heading" | "email" | null;

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
  const offline = !useOnline();
  const [step, setStep] = useState<Step>(linkProblem === "expired" ? "expired" : "start");
  const [email, setEmail] = useState("");
  const [startFocus, setStartFocus] = useState<StartFocus>(focusHeading ? "heading" : null);
  // The landing message belongs to the first visit only, not to a return from another step.
  const [returned, setReturned] = useState(false);
  const landingProblem = returned ? null : linkProblem;

  function backToStart(focus: StartFocus) {
    setStep("start");
    setStartFocus(focus);
    setReturned(true);
  }

  return (
    <SignInLayout step={step} offline={offline}>
      {step === "sent" ? (
        <CodeStep email={email} offline={offline} onUseDifferentEmail={() => { backToStart("heading"); }} />
      ) : step === "expired" ? (
        <ExpiredStep onSendNewLink={() => { backToStart("email"); }} />
      ) : (
        <>
          <StepHeading title={title} description="Save a link on one device, find it on all of them." focus={startFocus === "heading"} />
          <GoogleSignIn offline={offline} initialProblem={landingProblem === "google-failed" ? landingProblem : null} />
          <Divider />
          <EmailForm
            defaultEmail={email}
            offline={offline}
            initialProblem={landingProblem === "invalid" || landingProblem === "offline" ? landingProblem : null}
            focusEmail={startFocus === "email"}
            onSent={(address) => {
              setEmail(address);
              setStep("sent");
            }}
          />
          <p className="text-[13.5px] leading-normal text-subtle-foreground">
            No password needed.{" "}
            {INVITE_ONLY ? (
              <>
                linkables is invite-only for now;{" "}
                <a href={REQUEST_ACCESS_PATH} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                  request access
                </a>
                .
              </>
            ) : (
              "New here? Signing in creates your free account."
            )}{" "}
            By continuing you agree to the{" "}
            <a href="/terms" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
              Privacy policy
            </a>
            .
          </p>
        </>
      )}
    </SignInLayout>
  );
}

function GoogleSignIn({ offline, initialProblem }: { offline: boolean; initialProblem: "google-failed" | null }) {
  const start = useMutation({ mutationFn: signInWithGoogle });
  const result = start.isError ? ({ ok: false, problem: "google-failed" } as const) : start.data;
  const problem = start.isIdle ? initialProblem : result && !result.ok ? result.problem : null;

  return (
    <div className="flex flex-col gap-2">
      {problem ? (
        <p role="alert" className="text-sm text-destructive">
          {PROBLEM_MESSAGES[problem]}
        </p>
      ) : null}
      <Button
        variant="ghost"
        size="xl"
        disabled={offline || start.isPending}
        onClick={() => { start.mutate(); }}
        className="gap-3 bg-foreground font-bold text-background hover:bg-foreground hover:brightness-95"
      >
        {start.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <GoogleMark />}
        Continue with Google
      </Button>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3.5 text-[13px] text-subtle-foreground">
      <span aria-hidden className="h-px flex-1 bg-line-strong" />
      or
      <span aria-hidden className="h-px flex-1 bg-line-strong" />
    </div>
  );
}

type EmailFormProps = {
  defaultEmail: string;
  offline: boolean;
  initialProblem: "invalid" | "offline" | null;
  focusEmail: boolean;
  onSent: (email: string) => void;
};

function EmailForm({ defaultEmail, offline, initialProblem, focusEmail, onSent }: EmailFormProps) {
  const [problem, setProblem] = useState<SendLinkProblem | "invalid" | null>(initialProblem);
  const send = useMutation({ mutationFn: sendMagicLink });
  const form = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: defaultEmail } });
  const { shake, fieldProps } = useShake();
  const problemId = useId();
  const emailError = form.formState.errors.email?.message;
  const invalid = emailError !== undefined || problem === "invalid-email";
  const message = emailError ?? (problem ? PROBLEM_MESSAGES[problem] : null);

  function submit({ email }: SignInValues) {
    setProblem(null);
    send.mutate(email, {
      onSuccess: (result) => {
        if (result.ok) {
          onSent(email);
          return;
        }
        setProblem(result.problem);
        if (result.problem === "invalid-email") shake();
      },
      onError: () => { setProblem("failed"); },
    });
  }

  return (
    <form noValidate onSubmit={(event) => void form.handleSubmit(submit, shake)(event)} className="flex flex-col gap-2.5">
      <label htmlFor="email" className="text-sm font-semibold">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        autoFocus={focusEmail}
        {...form.register("email")}
        aria-invalid={invalid || undefined}
        aria-describedby={message ? problemId : undefined}
        {...fieldProps}
        className={cn(FILLED_FIELD, "h-[52px] px-4 text-base")}
      />
      {message ? (
        <p id={problemId} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      ) : null}
      <button type="submit" disabled={offline || send.isPending} className={cn(PRIMARY_BUTTON, "mt-1")}>
        {send.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
        {send.isPending ? "Sending…" : "Email me a sign-in link"}
      </button>
      <p role="status" className="sr-only">
        {send.isPending ? "Sending the sign-in email" : null}
      </p>
    </form>
  );
}

function ExpiredStep({ onSendNewLink }: { onSendNewLink: () => void }) {
  return (
    <>
      <StepHeading
        title="This link has expired"
        description="Sign-in links work once, for an hour. Send a new one and you're in."
      />
      <button type="button" onClick={onSendNewLink} className={PRIMARY_BUTTON}>
        Send a new link
      </button>
    </>
  );
}
