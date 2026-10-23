import { Navigate, Outlet, useLocation } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthPage } from "./AuthPage";
import { AuthStateContext, useAuthState } from "./auth-state";
import { openedFromEmailLink } from "./supabase";
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
  const onSignIn = useLocation({ select: (location) => location.pathname === "/sign-in" });

  if (auth.status === "loading") {
    return openedFromEmailLink ? <AuthPage title="Signing you in…" /> : null;
  }
  if (auth.status === "signed-out" && !onSignIn) return <Navigate to="/sign-in" replace />;
  if (auth.status === "signed-in" && onSignIn) return <Navigate to="/" replace />;
  return <Outlet />;
}
