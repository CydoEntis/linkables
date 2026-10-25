import { Download, ExternalLink, Share } from "lucide-react";
import { useId, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { EXTENSION_GUIDE_PATH } from "../extension-guide/path";
import { BookmarkletPanel } from "../save/BookmarkletDialog";
import { useInstallPrompt } from "./install-prompt";
import { SAVE_DEVICES, type SaveDevice } from "./save-device";
import { ShortcutGuide } from "./ShortcutGuide";

type SaveAnywhereStepsProps = { device: SaveDevice; shortcutUrl: string | undefined };

const DEVICE_NAMES: Record<SaveDevice, string> = {
  android: "On Android",
  iphone: "On iPhone or iPad",
  desktop: "On a computer",
};

// Leads with the one way that fits this device; the others wait behind "See other ways".
export function SaveAnywhereSteps({ device, shortcutUrl }: SaveAnywhereStepsProps) {
  const others = SAVE_DEVICES.filter((other) => other !== device);
  return (
    <div className="flex flex-col gap-4">
      <DeviceCard device={device} shortcutUrl={shortcutUrl} lead />
      <details className="group flex flex-col">
        <summary className="flex min-h-11 cursor-pointer items-center self-start rounded-md px-1 text-[14.5px] font-semibold text-primary underline-offset-4 hover:underline">
          <span className="group-open:hidden">See other ways</span>
          <span className="hidden group-open:inline">Hide other ways</span>
        </summary>
        <div className="mt-2 flex flex-col gap-4">
          {others.map((other) => (
            <DeviceCard key={other} device={other} shortcutUrl={shortcutUrl} />
          ))}
        </div>
      </details>
    </div>
  );
}

type DeviceCardProps = { device: SaveDevice; shortcutUrl: string | undefined; lead?: boolean };

function DeviceCard({ device, shortcutUrl, lead = false }: DeviceCardProps) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={lead ? "flex flex-col gap-4 rounded-[20px] bg-card p-5 md:p-6" : "flex flex-col gap-4 rounded-[20px] border border-border p-5 md:p-6"}
    >
      <h2 id={headingId} className="text-[12.5px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
        {DEVICE_NAMES[device]}
      </h2>
      {device === "android" ? <AndroidSteps onThisDevice={lead} /> : null}
      {device === "iphone" ? <IphoneSteps shortcutUrl={shortcutUrl} /> : null}
      {device === "desktop" ? <DesktopSteps /> : null}
    </section>
  );
}

function Step({ children }: { children: ReactNode }) {
  return <p className="text-[19px] leading-snug font-bold">{children}</p>;
}

function Note({ children }: { children: ReactNode }) {
  return <p className="text-[14.5px] leading-normal text-muted-foreground">{children}</p>;
}

// The lead card is this device's. Only there do the browser's install dialog and
// installed state describe the Android phone the card is about.
function AndroidSteps({ onThisDevice }: { onThisDevice: boolean }) {
  const installPrompt = useInstallPrompt();
  const install = onThisDevice ? installPrompt : null;
  // Sharing to linkables needs the installed app: only it is a share target.
  if (onThisDevice && window.matchMedia("(display-mode: standalone)").matches) {
    return <Step>In any app, tap Share, then linkables.</Step>;
  }
  return (
    <>
      <Step>Add linkables to your home screen</Step>
      <Note>Sharing to linkables works once it is on your home screen. In Chrome, tap ⋮ at the top right, then Install app or Add to home screen.</Note>
      {install ? (
        <Button size="xl" onClick={install} className="gap-2">
          <Download aria-hidden className="size-5" />
          Install linkables
        </Button>
      ) : null}
      <Note>
        Then in any app, tap Share <Share aria-hidden className="inline size-4 align-[-2px]" />, then linkables.
      </Note>
    </>
  );
}

function IphoneSteps({ shortcutUrl }: { shortcutUrl: string | undefined }) {
  if (!shortcutUrl) {
    return (
      <>
        <Step>The iPhone shortcut is coming soon.</Step>
        <Note>Until then, open linkables and paste a link to save it.</Note>
      </>
    );
  }
  return (
    <>
      <Step>Add the Save to linkables shortcut, then tap Share, then Save to linkables.</Step>
      <a
        href={shortcutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonVariants({ size: "xl", className: "gap-2" })}
      >
        Add the shortcut
        <ExternalLink aria-hidden className="size-[18px]" />
      </a>
      <ShortcutGuide />
      <Note>The shortcut opens linkables in your default browser (usually Safari), so sign in to linkables there once. The home-screen app keeps its own sign-in.</Note>
    </>
  );
}

function DesktopSteps() {
  return (
    <>
      <Step>Drag this button to your bookmarks bar</Step>
      <Note>Then click it on any page to save that page.</Note>
      <BookmarkletPanel />
      <Note>Or drag any link onto your links list.</Note>
      <a href={EXTENSION_GUIDE_PATH} className="self-start text-[14.5px] font-semibold text-primary underline-offset-4 hover:underline">
        Use Chrome? Try the linkables extension (beta)
      </a>
    </>
  );
}
