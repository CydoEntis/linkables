import { EXTENSION_CONNECT_PATH } from "@linkables/shared/extension-sessions";
import { useRef } from "react";
import { Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";


import { isPublicPage } from "../marketing/pages";

import { keepPendingConnect, keepPendingSave, pendingReturnHref, SAVE_PATH } from "../save/pending-save";
import { AuthPage } from "./AuthPage";
import { AuthStateContext, useAuthState } from "./auth-state";
import { useAuth } from "./use-auth";
import { wasAccountDeleted } from "../settings/account-deleted";
import { ACCOUNT_DELETED_PATH } from "../settings/path";

export function AuthGate() {
  const auth = useAuth();
  const identity = useRef<string | null>(null);
  const generation = useRef(0);
  const userId = auth.status === "signed-in" ? auth.session.user.id : null;
  // Remount after an established account changes, but keep public queries alive
  // while the initial cookie check resolves.
  if (identity.current !== null && identity.current !== userId) generation.current += 1;
  identity.current = userId;
  return (
    <AuthStateContext value={auth}>
      <GatedOutlet key={generation.current} />
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
    if (wasAccountDeleted()) return <Navigate to={ACCOUNT_DELETED_PATH} replace />;
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

