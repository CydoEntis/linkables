import { createContext, useContext } from "react";
import type { AuthState } from "./use-auth";

// One useAuth subscription for the whole app: readLinkProblem consumes the URL, so it must run once.
export const AuthStateContext = createContext<AuthState | null>(null);

export function useAuthState(): AuthState {
  const state = useContext(AuthStateContext);
  if (state === null) throw new Error("useAuthState must be used inside AuthStateContext");
  return state;
}

export function useSignedInEmail(): string | undefined {
  const state = useAuthState();
  return state.status === "signed-in" ? state.session.user.email : undefined;
}
