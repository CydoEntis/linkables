import { useEffect, useState } from "react";
import { currentSession, loadSession, subscribeSession, type Session } from "./session";

export type AuthState =
  | { status: "loading" }
  | { status: "signed-in"; session: Session }
  | { status: "signed-out"; linkProblem: null; afterSignOut: boolean }
  | { status: "unavailable"; retry: () => void };

export function useAuth(): AuthState {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<AuthState>({ status: "loading" });
  useEffect(() => {
    let disposed = false;
    let changed = false;
    const unsubscribe = subscribeSession((session) => {
      changed = true;
      setState(session ? { status: "signed-in", session } : { status: "signed-out", linkProblem: null, afterSignOut: true });
    });
    const existing = currentSession();
    if (existing) setState({ status: "signed-in", session: existing });
    else void loadSession().then((session) => {
      if (!disposed) setState(session ? { status: "signed-in", session } : { status: "signed-out", linkProblem: null, afterSignOut: false });
    }).catch(() => {
      if (!disposed && !changed) setState({ status: "unavailable", retry: () => { setState({ status: "loading" }); setAttempt((value) => value + 1); } });
    });
    return () => { disposed = true; unsubscribe(); };
  }, [attempt]);
  return state;
}
