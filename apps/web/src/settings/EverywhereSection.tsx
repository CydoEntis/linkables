import { Link } from "@tanstack/react-router";
import { Download, ExternalLink } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { env } from "../config/env";
import { EXTENSION_GUIDE_PATH } from "../extension-guide/path";
import { useInstallPrompt } from "../save-anywhere/install-prompt";
import { SAVE_ANYWHERE_PATH } from "../save-anywhere/SaveAnywherePage";
import { SettingsRow, SettingsSection } from "./SettingsSection";

const ACTION = buttonVariants({ variant: "ghost", size: "touch" });

export function EverywhereSection({ shortcutUrl = env.VITE_IOS_SHORTCUT_URL }: { shortcutUrl?: string | undefined }) {
  return (
    <SettingsSection title="Get linkables everywhere">
      <SettingsRow label="Chrome extension" detail="Save the page you're on in one click (beta).">
        <Link to={EXTENSION_GUIDE_PATH} className={ACTION}>
          Get the extension
        </Link>
      </SettingsRow>
      <SettingsRow
        label="iPhone Shortcut"
        detail={shortcutUrl ? "Save from Share on iPhone or iPad." : "The iPhone shortcut is coming soon."}
      >
        {shortcutUrl ? (
          <a href={shortcutUrl} target="_blank" rel="noopener noreferrer" className={ACTION}>
            Add the shortcut
            <ExternalLink aria-hidden />
          </a>
        ) : null}
      </SettingsRow>
      <InstallRow />
      <Link to={SAVE_ANYWHERE_PATH} className="self-start text-[14.5px] font-semibold text-primary underline-offset-4 hover:underline">
        All the ways to save
      </Link>
    </SettingsSection>
  );
}

// The browser's own install dialog where it offers one; elsewhere, how to add it by hand.
function InstallRow() {
  const install = useInstallPrompt();
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return <SettingsRow label="Install the app" detail="You're using the installed app." />;
  }
  return (
    <SettingsRow
      label="Install the app"
      detail={install ? "Add linkables to your home screen or dock." : "In Chrome on Android, tap ⋮, then Install app. On a computer, use Install in the address bar."}
    >
      {install ? (
        <Button variant="ghost" size="touch" onClick={install}>
          <Download aria-hidden />
          Install linkables
        </Button>
      ) : null}
    </SettingsRow>
  );
}
