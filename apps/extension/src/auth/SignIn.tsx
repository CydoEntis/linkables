import { zodResolver } from "@hookform/resolvers/zod";
import { signInRequestSchema } from "@linkables/shared/auth";
import { ApiError } from "@linkables/shared/api-client";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, FILLED_FIELD, OfflineNote, PRIMARY_BUTTON, Wordmark } from "../ui";
import { configureServer, readConnection, signIn } from "./session";
import { useOnline } from "./use-online";

export function SignIn() {
  const offline = !useOnline();
  const [origin, setOrigin] = useState("");
  const [configured, setConfigured] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const form = useForm({ resolver: zodResolver(signInRequestSchema), defaultValues: { email: "", password: "" } });
  const login = useMutation({ mutationFn: signIn });
  useEffect(() => {
    void readConnection().then((connection) => {
      if (connection) { setOrigin(connection.origin); setConfigured(true); }
    }, () => { setProblem("Could not read your server settings."); });
  }, []);
  function chooseServer() {
    setProblem(null);
    void configureServer(origin).then(() => { form.reset(); setConfigured(true); }, (error: unknown) => {
      setProblem(error instanceof Error ? error.message : "Could not connect to this server.");
    });
  }
  return (
    <main className="flex flex-col gap-4 p-5">
      <Wordmark />
      {offline ? <OfflineNote /> : null}
      <h1 className="text-lg font-bold">{configured ? "Sign in to your server" : "Connect your Linkables server"}</h1>
      {configured ? (
        <>
          <p className="break-all text-xs text-muted-foreground">{origin}</p>
          <form noValidate className="flex flex-col gap-2" onSubmit={(event) => void form.handleSubmit((values) => { login.mutate(values); })(event)}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="username" {...form.register("email")} className={FILLED_FIELD + " h-11 px-3"} />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" {...form.register("password")} className={FILLED_FIELD + " h-11 px-3"} />
            <p role="alert">{form.formState.errors.email?.message ?? form.formState.errors.password?.message ?? (login.error instanceof ApiError ? login.error.message : login.isError ? "Could not sign in. Try again." : null)}</p>
            <button type="submit" disabled={offline || login.isPending} className={PRIMARY_BUTTON}>{login.isPending ? "Signing in…" : "Sign in"}</button>
          </form>
          <button type="button" onClick={() => { form.reset(); setConfigured(false); login.reset(); }}>Change server</button>
        </>
      ) : (
        <>
          <label htmlFor="server">Server address</label>
          <input id="server" type="url" placeholder="https://your-server.example.com" value={origin} onChange={(event) => { setOrigin(event.target.value); }} className={FILLED_FIELD + " h-11 px-3"} />
          <button type="button" onClick={chooseServer} className={PRIMARY_BUTTON}>Connect</button>
          <p className="text-xs text-muted-foreground">For a private instance, connect to its Tailscale network first.</p>
        </>
      )}
      {problem ? <Alert>{problem}</Alert> : null}
    </main>
  );
}
