import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { readLinkProblem, type LinkProblem } from "./link-landing";
import { removeRejectedTokensFromUrl } from "./sign-in-return";
import { supabase } from "./supabase";

export type AuthState =
  | { status: "loading" }
  | { status: "signed-in"; session: Session }
  | { status: "signed-out"; linkProblem: LinkProblem | null; afterSignOut: boolean };

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    // Counts auth events so a slow landing check cannot overwrite a newer one.
    let latestEvent = 0;
    let disposed = false;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const thisEvent = ++latestEvent;
      if (session) {
        removeRejectedTokensFromUrl();
        setState({ status: "signed-in", session });
      } else if (event === "INITIAL_SESSION") {
        // Not awaited: supabase-js awaits listeners, and initialize() has already settled.
        void readLinkProblem().then((linkProblem) => {
          if (!disposed && thisEvent === latestEvent) setState({ status: "signed-out", linkProblem, afterSignOut: false });
        });
      } else {
        setState({ status: "signed-out", linkProblem: null, afterSignOut: true });
      }
    });
    return () => {
      disposed = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
