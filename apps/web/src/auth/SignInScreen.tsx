import { zodResolver } from "@hookform/resolvers/zod";
import { signInRequestSchema } from "@linkables/shared/auth";
import { ApiError } from "@linkables/shared/api-client";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { LoaderCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { pendingSaveHref } from "../save/pending-save";
import { useAuthState } from "./auth-state";
import { signIn } from "./session";
import { FILLED_FIELD, PRIMARY_BUTTON, SignInLayout, StepHeading } from "./SignInLayout";
import { useOnline } from "./use-online";

export function SignInPage() {
  const auth = useAuthState();
  if (auth.status !== "signed-out") return null;
  return <SignInScreen focusHeading={auth.afterSignOut} title={pendingSaveHref() ? "Sign in to save this link" : undefined} />;
}

export function SignInScreen({ focusHeading = false, title = "Sign in to linkables" }: { focusHeading?: boolean; title?: string | undefined }) {
  const offline = !useOnline();
  const form = useForm({ resolver: zodResolver(signInRequestSchema), defaultValues: { email: "", password: "" } });
  const login = useMutation({ mutationFn: signIn });
  const error = login.error instanceof ApiError ? login.error.message : login.isError ? "Could not sign in. Check your connection and try again." : null;
  return (
    <SignInLayout step="password" offline={offline}>
      <StepHeading title={title} description="Sign in to your own Linkables server." focus={focusHeading} />
      <form noValidate onSubmit={(event) => void form.handleSubmit((values) => { login.mutate(values); })(event)} className="flex flex-col gap-2.5">
        <Field data-invalid={!!form.formState.errors.email}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <input id="email" type="email" autoComplete="username" {...form.register("email")} aria-invalid={!!form.formState.errors.email} aria-describedby="sign-in-errors" className={cn(FILLED_FIELD, "h-[52px] px-4 text-base")} />
        </Field>
        <Field data-invalid={!!form.formState.errors.password}>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <input id="password" type="password" autoComplete="current-password" {...form.register("password")} aria-invalid={!!form.formState.errors.password} aria-describedby="sign-in-errors" className={cn(FILLED_FIELD, "h-[52px] px-4 text-base")} />
        </Field>
        <FieldError id="sign-in-errors">{form.formState.errors.email?.message ?? form.formState.errors.password?.message ?? error}</FieldError>
        <button type="submit" disabled={offline || login.isPending} className={PRIMARY_BUTTON}>
          {login.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
          {login.isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-muted-foreground">Accounts are provided by the person running this server. Contact them if you need an account or a password reset.</p>
    </SignInLayout>
  );
}
