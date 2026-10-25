import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignedInEmail } from "../auth/auth-state";
import { signOut } from "../auth/supabase";
import { SettingsRow, SettingsSection } from "./SettingsSection";

export function AccountSection() {
  const email = useSignedInEmail() ?? "";
  return (
    <SettingsSection title="Account">
      <SettingsRow label="Signed in as" detail={email}>
        <Button variant="ghost" size="touch" onClick={() => void signOut()}>
          <LogOut aria-hidden />
          Sign out
        </Button>
      </SettingsRow>
    </SettingsSection>
  );
}
