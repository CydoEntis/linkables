import { EXTENSION_CONNECT_PATH } from "@linkables/shared/extension-sessions";
import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";


import { isPublicPage } from "../marketing/pages";

import { keepPendingConnect, keepPendingSave, pendingReturnHref, SAVE_PATH } from "../save/pending-save";
import { AuthPage } from "./AuthPage";
import { AuthStateContext, useAuthState } from "./auth-state";
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
    return <AuthPage title="Opening your library…" />;
  }
  if (auth.status === "unavailable") return <AuthPage title="Could not reach your server"><button type="button" onClick={auth.retry}>Try again</button></AuthPage>;

  if (auth.status === "signed-out" && !onSignIn) {
    // Written during render so it lands before Navigate's effect leaves /save; the write is idempotent.
    if (pathname === SAVE_PATH && searchStr) keepPendingSave(searchStr);
    if (pathname === EXTENSION_CONNECT_PATH) keepPendingConnect();
    return <Navigate to="/sign-in" replace />;
  }
  if (auth.status === "signed-in" && onSignIn) {
    const pending = pendingReturnHref();
    return pending ? <Navigate to={pending} href={pending} replace /> : <Navigate to="/" replace />;
  }
  return <Outlet />;
}

