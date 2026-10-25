import { SignIn } from "./auth/SignIn";
import { useSession } from "./auth/use-session";
import { SaveView } from "./save/SaveView";

export function Popup() {
  const session = useSession();
  // Reading the stored session takes a moment; an empty card avoids flashing sign-in at a signed-in user.
  if (session === "loading") return <div aria-busy className="h-[72px]" />;
  return session === "signed-in" ? <SaveView /> : <SignIn />;
}
