import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { Wordmark } from "../shell/Wordmark";

// CI copies the latest extension build here (apps/extension/README.md).
const DOWNLOAD_URL = "/downloads/linkables-chrome.zip";

function Mono({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[14px] text-foreground">{children}</span>;
}

const STEPS: { title: ReactNode; detail?: ReactNode }[] = [
  {
    title: "Download the extension",
    detail: (
      <a
        href={DOWNLOAD_URL}
        download
        className="mt-3 flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-bold text-primary-foreground sm:w-auto sm:self-start"
      >
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
  { title: "Pin linkables to the toolbar", detail: "Click the puzzle piece next to the address bar, then the pin beside linkables." },
  { title: "Sign in with your email code", detail: "Click linkables on any page. We email you a 6-digit code; after that, one click saves the page." },
];

export function ExtensionGuidePage() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[600px] flex-col gap-6 px-4 pt-[max(16px,env(safe-area-inset-top))] pb-16 md:pt-10">
      <header className="flex items-center justify-between gap-4">
        <Link to="/" className="flex min-h-11 items-center rounded-md" aria-label="linkables, All links">
          <Wordmark />
        </Link>
      </header>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.03em] md:text-[34px]">linkables for Chrome</h1>
        <p className="text-[15px] leading-normal text-muted-foreground">
          The beta isn't in the Chrome Web Store yet, so it goes in by hand. It takes about a minute.
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
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
        To update, download it again, replace the folder's contents, and press the reload arrow on linkables in{" "}
        <Mono>chrome://extensions</Mono>.
      </p>
    </main>
  );
}
