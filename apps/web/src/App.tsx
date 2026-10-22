import { AuthPage } from "./auth/AuthPage";
import { SignInScreen } from "./auth/SignInScreen";
import { openedFromEmailLink } from "./auth/supabase";
import { useAuth } from "./auth/use-auth";
import { HomeScreen } from "./home/HomeScreen";

export function App() {
  const auth = useAuth();

  if (auth.status === "loading") {
    return openedFromEmailLink ? <AuthPage title="Signing you in…" /> : null;
  }
  if (auth.status === "signed-in") return <HomeScreen email={auth.session.user.email} />;
  return <SignInScreen linkProblem={auth.linkProblem} focusHeading={auth.afterSignOut} />;
}
