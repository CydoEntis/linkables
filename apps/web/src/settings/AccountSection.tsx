import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthState } from "../auth/auth-state";
import { signOut } from "../auth/session";
import { SETTINGS_ACTION, SettingsRow, SettingsSection } from "./SettingsSection";
import { signInMethod } from "./sign-in-method";

export function AccountSection() {
  const auth = useAuthState();
  const user = auth.status === "signed-in" ? auth.session.user : undefined;
  const email = user?.email ?? "";
  return (
    <SettingsSection title="Account">
      <SettingsRow
        label={email}
        detail={user ? signInMethod() : undefined}
        leading={
          <span aria-hidden className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-accent font-bold">
            {email.charAt(0).toUpperCase() || "?"}
          </span>
        }
      >
        <Button variant="ghost" className={SETTINGS_ACTION} onClick={() => void signOut()}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </SettingsRow>
    </SettingsSection>
  );
}

