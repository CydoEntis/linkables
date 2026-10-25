import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { LandingPage } from "../marketing/landing/LandingPage";
import { isPublicPage } from "../marketing/pages";
import { showsLanding } from "../marketing/show-landing";
import { keepPendingSave, pendingSaveHref, SAVE_PATH } from "../save/pending-save";
import { AuthPage } from "./AuthPage";
import { AuthStateContext, useAuthState } from "./auth-state";
import { returningFromSignIn } from "./supabase";
import { useAuth } from "./use-auth";

export function AuthGate() {
  const auth = useAuth();
  return (
    <AuthStateContext value={auth}>
      <GatedOutlet />
      <Toaster />
    </AuthStateContext>
  );
}

function GatedOutlet() {
  const auth = useAuthState();
  // The rendered page, not the pending one: mid-navigation the Outlet still shows the
  // old route, so gating on the new location would mount it signed out.
  const { pathname, searchStr } = useRouterState({ select: (state) => state.resolvedLocation ?? state.location });
  const onSignIn = pathname === "/sign-in";

  if (isPublicPage(pathname)) return <Outlet />;
  if (auth.status === "loading") {
    return returningFromSignIn ? <AuthPage title="Signing you in…" /> : null;
  }
  if (showsLanding(auth, pathname)) return <LandingPage />;
  if (auth.status === "signed-out" && !onSignIn) {
    // Written during render so it lands before Navigate's effect leaves /save; the write is idempotent.
    if (pathname === SAVE_PATH && searchStr) keepPendingSave(searchStr);
    return <Navigate to="/sign-in" replace />;
  }
  if (auth.status === "signed-in" && onSignIn) {
    const pending = pendingSaveHref();
    return pending ? <Navigate to={SAVE_PATH} href={pending} replace /> : <Navigate to="/" replace />;
  }
  return <Outlet />;
}
