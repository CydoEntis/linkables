import { Link } from "@tanstack/react-router";
import { Copy, Share } from "lucide-react";
import type { ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { AddToChromeLink, ChromeMark } from "../extension-guide/AddToChrome";
import { CHROME_WEB_STORE_URL, EXTENSION_GUIDE_PATH } from "../extension-guide/path";
import { useWideScreen } from "../link-details/use-wide-screen";
import { useInstallPrompt } from "../save-anywhere/install-prompt";
import { SAVE_ANYWHERE_PATH } from "../save-anywhere/SaveAnywherePage";
import { modKeyLabel } from "../search/shortcut-keys";
import { ChromePicture, PastePicture, SharePicture } from "./FirstLinkPictures";
import { useLinksUi } from "./links-ui-store";

type Way = { title: string; text: string; art: ReactNode; action: ReactNode };

// A new account's empty list: the three ways to save, each with its own way in.
export function FirstLinks() {
  return useWideScreen() ? <DesktopWays /> : <PhoneWays />;
}

const DESKTOP_ACTION = "mt-auto h-[42px] w-full font-bold";

function DesktopWays() {
  const ways: Way[] = [
    {
      title: "Paste a link",
      text: `Copy any link and paste it in the box above. ${modKeyLabel()}V works anywhere on this page.`,
      art: <PastePicture />,
      action: (
        <Button variant="ghost" size="touch" onClick={focusSaveBar} className={DESKTOP_ACTION}>
          Paste a link
        </Button>
      ),
    },
    {
      title: "Share from your phone",
      text: "Open linkables.app on your phone and add it to your Home Screen. Then it shows up when you tap Share.",
      art: <SharePicture />,
      action: (
        <Link to={SAVE_ANYWHERE_PATH} className={buttonVariants({ variant: "ghost", size: "touch", className: DESKTOP_ACTION })}>
          Set up your phone
        </Link>
      ),
    },
    {
      title: "Chrome extension",
      text: "Save the tab you're on in one click, and see your links in a side panel.",
      art: <ChromePicture />,
      action: <AddToChromeLink look={{ size: "touch", className: DESKTOP_ACTION }}>Add to Chrome</AddToChromeLink>,
    },
  ];

  return (
    <div className="flex max-w-[1040px] animate-fade-up flex-col gap-[22px] pt-[30px]">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-2xl font-bold tracking-[-0.015em]">Save your first link</h2>
        <p className="text-[15px] text-muted-foreground">Three ways in. Use whichever is closest.</p>
      </div>
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        {ways.map((way, index) => (
          <li key={way.title} className="flex flex-col overflow-hidden rounded-[18px] border border-border bg-card">
            <div aria-hidden className="flex h-[150px] items-center justify-center border-b border-border bg-sidebar p-5">
              {way.art}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-[18px]">
              <span aria-hidden className="font-mono text-[11.5px] text-subtle-foreground">{`0${String(index + 1)}`}</span>
              <h3 className="text-[16.5px] font-bold">{way.title}</h3>
              <p className="mb-2 text-[13.5px] leading-normal text-muted-foreground">{way.text}</p>
              {way.action}
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[13px] text-subtle-foreground">Links you save show up here, newest first. Sort them into collections whenever you like.</p>
    </div>
  );
}

// The save bar holds the paste; Ctrl/⌘ V anywhere on the page would land there too.
function focusSaveBar() {
  document.querySelector<HTMLInputElement>("form[role=search] [data-save-field]")?.focus();
}

const PHONE_ACTION = "h-12 w-full text-[15px] font-bold";

function PhoneWays() {
  const setSaveSheetOpen = useLinksUi((state) => state.setSaveSheetOpen);
  const ways: Way[] = [
    {
      title: "Paste a link",
      text: "Copy a link, tap +, then Paste. That's it.",
      art: <Copy className="size-[18px]" />,
      action: (
        <Button variant="ghost" size="touch" onClick={() => { setSaveSheetOpen(true); }} className={PHONE_ACTION}>
          Paste a link
        </Button>
      ),
    },
    {
      title: "Share from your phone",
      text: "Add linkables to your Home Screen. Then it appears when you tap Share in any app.",
      art: <Share className="size-[18px]" />,
      action: <AddToHomeScreen />,
    },
    {
      title: "Chrome extension",
      text: "On your computer, the Chrome extension saves the tab you're on in one click.",
      art: <ChromeMark className="size-[18px]" />,
      action: (
        <a href={extensionMailto()} className={buttonVariants({ variant: "ghost", size: "touch", className: PHONE_ACTION })}>
          Email me the link
        </a>
      ),
    },
  ];

  return (
    <div className="flex animate-fade-up flex-col gap-3 px-2 pt-4">
      <h2 className="px-1 pb-0.5 text-[15px] text-muted-foreground">Save your first link. Three ways in:</h2>
      <ul className="flex flex-col gap-3">
        {ways.map((way) => (
          <li key={way.title} className="flex flex-col gap-3.5 rounded-[18px] border border-border bg-card p-4">
            <div className="flex items-start gap-3.5">
              <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-accent">
                {way.art}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h3 className="text-base font-bold">{way.title}</h3>
                <p className="text-sm leading-normal text-muted-foreground">{way.text}</p>
              </div>
            </div>
            {way.action}
          </li>
        ))}
      </ul>
    </div>
  );
}

// The browser's own install dialog where it offers one; otherwise the steps for this phone.
function AddToHomeScreen() {
  const install = useInstallPrompt();
  if (install) {
    return (
      <Button size="touch" onClick={install} className={PHONE_ACTION}>
        Add to Home Screen
      </Button>
    );
  }
  return (
    <Link to={SAVE_ANYWHERE_PATH} className={buttonVariants({ size: "touch", className: PHONE_ACTION })}>
      Add to Home Screen
    </Link>
  );
}

// The extension is for a computer, so the phone sends its address to the user's own inbox.
function extensionMailto(): string {
  const url = CHROME_WEB_STORE_URL ?? `${window.location.origin}${EXTENSION_GUIDE_PATH}`;
  const params = new URLSearchParams({ subject: "The linkables Chrome extension", body: `Add linkables to Chrome on your computer: ${url}` });
  return `mailto:?${params.toString().replaceAll("+", "%20")}`;
}
