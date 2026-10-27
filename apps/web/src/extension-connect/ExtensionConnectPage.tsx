import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AuthPage } from "../auth/AuthPage";
import { EXTENSION_GUIDE_PATH } from "../extension-guide/path";
import { clearPendingSave } from "../save/pending-save";
import { readExtensionMessage } from "./messages";

// The content script answers the app's ping at once; this is long enough for a
// busy browser and short enough not to leave someone waiting on nothing.
export const NO_EXTENSION_MS = 5000;

type ConnectStatus = "waiting" | "connecting" | "connected" | "failed" | "no-extension";

// The hand-off itself runs in useExtensionHandoff (AuthGate); this page only shows how it went.
function useConnectStatus(): ConnectStatus {
  const [status, setStatus] = useState<ConnectStatus>("waiting");
  useEffect(() => {
    // Signed in by now, so the sign-in that brought the user here is spent.
    clearPendingSave();
    const timer = setTimeout(() => {
      setStatus((current) => (current === "waiting" ? "no-extension" : current));
    }, NO_EXTENSION_MS);
    function onMessage(event: MessageEvent) {
      const message = readExtensionMessage(event);
      if (message?.type === "linkables:extension-hello") setStatus((current) => (current === "waiting" ? "connecting" : current));
      if (message?.type === "linkables:extension-connected") setStatus(message.ok ? "connected" : "failed");
    }
    window.addEventListener("message", onMessage);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
    };
  }, []);
  return status;
}

const ICON = "size-8";
const ACTION = buttonVariants({ size: "xl", className: "w-full" });
const SECOND_ACTION = buttonVariants({ variant: "ghost", size: "xl", className: "w-full" });

function TryAgain({ primary }: { primary: boolean }) {
  return (
    <button type="button" onClick={() => { window.location.reload(); }} className={primary ? ACTION : SECOND_ACTION}>
      Try again
    </button>
  );
}

export function ExtensionConnectPage() {
  const status = useConnectStatus();
  switch (status) {
    case "connected":
      return (
        <AuthPage
          focusHeading
          title="The extension is signed in"
          description="You can close this tab."
          icon={<CircleCheck aria-hidden className={`${ICON} text-primary`} />}
        />
      );
    case "failed":
      return (
        <AuthPage
          focusHeading
          title="Couldn't sign in the extension"
          description="Try again, or open the extension and sign in with Google or an email code."
          icon={<CircleAlert aria-hidden className={`${ICON} text-destructive`} />}
        >
          <TryAgain primary />
        </AuthPage>
      );
    case "no-extension":
      return (
        <AuthPage
          focusHeading
          title="The extension didn't answer"
          description="Check that linkables for Chrome is installed and turned on, then try again."
          icon={<CircleAlert aria-hidden className={`${ICON} text-muted-foreground`} />}
        >
          <div className="flex flex-col gap-2">
            <TryAgain primary />
            <a href={EXTENSION_GUIDE_PATH} className={SECOND_ACTION}>
              Get the extension
            </a>
          </div>
        </AuthPage>
      );
    default:
      return (
        <AuthPage title="Connecting the extension…" icon={<LoaderCircle aria-hidden className={`${ICON} animate-spin text-muted-foreground`} />} />
      );
  }
}
