import type { ListedCollection } from "@linkables/shared/collections";
import { Settings } from "lucide-react";
import { useState } from "react";
import { HostAccessGate } from "../permissions/HostAccessGate";
import { SignIn } from "../auth/SignIn";
import { useSession } from "../auth/use-session";
import { Wordmark } from "../ui";
import { ExtensionSettings } from "./ExtensionSettings";
import { Library } from "./Library";
import { ShareSheet } from "./ShareSheet";
import { ThisPage } from "./ThisPage";

export function SidePanel() {
  const session = useSession();
  if (session === "loading") return <div aria-busy className="h-[72px]" />;
  return <HostAccessGate>{session === "signed-in" ? <SignedIn /> : <SignIn />}</HostAccessGate>;
}

function SignedIn() {
  const [view, setView] = useState<"home" | "settings">("home");
  const [sharing, setSharing] = useState<ListedCollection | null>(null);
  if (view === "settings") return <ExtensionSettings onBack={() => { setView("home"); }} />;

  return (
    <main className="flex min-h-screen flex-col gap-3.5 p-4">
      <header className="flex items-center justify-between">
        <Wordmark />
        <button
          type="button"
          aria-label="Extension settings"
          onClick={() => { setView("settings"); }}
          className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Settings aria-hidden className="size-4" />
        </button>
      </header>
      <ThisPage />
      <Library onShare={setSharing} />
      <ShareSheet collection={sharing} onClose={() => { setSharing(null); }} />
    </main>
  );
}
