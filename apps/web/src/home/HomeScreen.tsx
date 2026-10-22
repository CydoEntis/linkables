import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ApiError, NETWORK_ERROR } from "../api/client";
import { signOut } from "../auth/supabase";
import { useMe } from "../auth/use-me";

// shortcut: placeholder until the app shell exists; proves the session reaches the API.
export function HomeScreen({ email }: { email: string | undefined }) {
  const me = useMe();
  const signOutMutation = useMutation({ mutationFn: signOut });

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-6 px-4 py-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">You're signed in</h1>
        <p className="text-sm break-all text-muted-foreground">{email}</p>
      </header>
      <section aria-labelledby="me-heading" className="space-y-2">
        <h2 id="me-heading" className="text-sm font-medium">
          GET /me
        </h2>
        <p role="status" className="text-sm empty:hidden">
          {me.isPending ? "Loading your account…" : null}
        </p>
        {me.isError ? (
          <p role="alert" className="text-sm text-destructive">
            {meErrorMessage(me.error)}
          </p>
        ) : null}
        {me.data ? (
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-sm">{JSON.stringify(me.data, null, 2)}</pre>
        ) : null}
      </section>
      <Button
        variant="outline"
        disabled={signOutMutation.isPending}
        onClick={() => { signOutMutation.mutate(); }}
        className="h-11"
      >
        Sign out
      </Button>
    </main>
  );
}

function meErrorMessage(error: Error): string {
  if (error instanceof ApiError && error.code === NETWORK_ERROR) {
    return "Can't reach the server. Check your connection and try again.";
  }
  const code = error instanceof ApiError ? error.code : "UNKNOWN";
  return `Couldn't load your account (${code}).`;
}
