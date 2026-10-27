import { Link } from "@tanstack/react-router";
import { Download, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "../shell/Wordmark";
import { CHROME_WEB_STORE_URL } from "./path";

// CI copies the latest extension build here (apps/extension/README.md).
const DOWNLOAD_URL = "/downloads/linkables-chrome.zip";

// The signed add-on (apps/extension/README.md). Firefox installs it on click; a new release is a new download.
const FIREFOX_ADDON_URL = "/downloads/linkables-firefox.xpi";

const PRIMARY_LINK = buttonVariants({ size: "xl", className: "mt-3 w-full gap-2 sm:w-auto sm:self-start" });

function Mono({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[14px] text-foreground">{children}</span>;
}

type Step = { title: ReactNode; detail?: ReactNode };

const AFTER_INSTALL: Step[] = [
  { title: "Pin linkables to the toolbar", detail: "Click the puzzle piece next to the address bar, then the pin beside linkables." },
  {
    title: "Sign in",
    detail: "Signed in here on linkables.app, the extension signs itself in. Or click linkables and sign in with Google or a 6-digit email code. After that, one click saves the page.",
  },
];

const BY_HAND_STEPS: Step[] = [
  {
    title: "Download the extension",
    detail: (
      <a href={DOWNLOAD_URL} download className={PRIMARY_LINK}>
        <Download aria-hidden className="size-5" />
        Download for Chrome
      </a>
    ),
  },
  {
    title: "Unzip it",
    detail: "Keep the folder somewhere it can stay, like Documents: Chrome loads linkables from it.",
  },
  { title: <>Open <Mono>chrome://extensions</Mono> in Chrome</>, detail: "Type it in the address bar." },
  { title: "Turn on Developer mode", detail: "The switch is at the top right." },
  { title: "Click Load unpacked and pick the unzipped folder" },
  ...AFTER_INSTALL,
];

const FIREFOX_STEPS: Step[] = [
  {
    title: "Add linkables to Firefox",
    detail: (
      <a href={FIREFOX_ADDON_URL} className={PRIMARY_LINK}>
        <Plus aria-hidden className="size-5" />
        Add to Firefox
      </a>
    ),
  },
  { title: "Allow it", detail: "Firefox asks once to let linkables.app install an add-on, then to add linkables. Say yes to both." },
  ...AFTER_INSTALL,
];

function storeSteps(storeUrl: string): Step[] {
  return [
    {
      title: "Add linkables from the Chrome Web Store",
      detail: (
        <a href={storeUrl} className={PRIMARY_LINK}>
          <Plus aria-hidden className="size-5" />
          Add to Chrome
        </a>
      ),
    },
    ...AFTER_INSTALL,
  ];
}

const isFirefox = () => navigator.userAgent.includes("Firefox/");

export function ExtensionGuidePage({ storeUrl = CHROME_WEB_STORE_URL, firefox = isFirefox() }: { storeUrl?: string | undefined; firefox?: boolean }) {
  const steps = firefox ? FIREFOX_STEPS : storeUrl ? storeSteps(storeUrl) : BY_HAND_STEPS;
  const browser = firefox ? "Firefox" : "Chrome";
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[600px] flex-col gap-6 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-16 md:pt-10">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="flex min-h-11 items-center rounded-md" aria-label="linkables, All links">
          <Wordmark />
        </Link>
      </header>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.03em] md:text-[34px]">linkables for {browser}</h1>
        <p className="text-[15px] leading-normal text-muted-foreground">
          {firefox
            ? "The beta is a signed Firefox add-on. Add it, pin it and sign in."
            : storeUrl
            ? "The beta is in the Chrome Web Store. Add it, pin it and sign in."
            : "The beta isn't in the Chrome Web Store yet, so it goes in by hand. It takes about a minute."}
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-4 rounded-[20px] bg-card p-5">
            <span aria-hidden className="flex size-8 flex-none items-center justify-center rounded-full bg-muted text-[15px] font-bold">
              {i + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
              <p className="text-[17px] leading-snug font-bold">{step.title}</p>
              {typeof step.detail === "string" ? <p className="text-[14.5px] leading-normal text-muted-foreground">{step.detail}</p> : step.detail}
            </div>
          </li>
        ))}
      </ol>
      <p className="text-[14px] leading-normal text-subtle-foreground">
        {firefox ? (
          "Firefox keeps the add-on until you remove it in the Add-ons Manager. A new release is a new download from this page."
        ) : storeUrl ? (
          <>
            Chrome keeps it up to date. If you installed linkables by hand before, remove that copy in <Mono>chrome://extensions</Mono>.
          </>
        ) : (
          <>
            To update, download it again, replace the folder's contents, and press the reload arrow on linkables in{" "}
            <Mono>chrome://extensions</Mono>.
          </>
        )}
      </p>
    </main>
  );
}
