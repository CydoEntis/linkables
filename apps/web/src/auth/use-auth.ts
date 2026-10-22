import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { readLinkProblem, type LinkProblem } from "./link-landing";
import { supabase } from "./supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "signed-in"; session: Session }
  | { status: "signed-out"; linkProblem: LinkProblem | null };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setState({ status: "signed-in", session });
      } else if (event === "INITIAL_SESSION") {
        // Not awaited: supabase-js awaits listeners, and initialize() has already settled.
        void readLinkProblem().then((linkProblem) => {
          setState({ status: "signed-out", linkProblem });
        });
      } else {
        setState({ status: "signed-out", linkProblem: null });
      }
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
