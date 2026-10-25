import type { AuthState } from "../auth/use-auth";

// A visitor at / sees the landing page. Someone who just signed out, or who
// followed a broken sign-in link, still needs the sign-in screen instead.
export function showsLanding(auth: AuthState, pathname: string): boolean {
  return pathname === "/" && auth.status === "signed-out" && auth.linkProblem === null && !auth.afterSignOut;
}
