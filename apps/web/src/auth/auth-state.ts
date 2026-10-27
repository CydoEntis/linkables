import { createContext, useContext } from "react";
import type { AuthState } from "./use-auth";

// One session subscription drives the gate and account controls.
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
