import type { ReactNode } from "react";

const STEPS: { title: string; detail: string; picture: ReactNode }[] = [
  { title: "Get the shortcut", detail: "Tap Add the shortcut. It opens in the Shortcuts app.", picture: <GetPicture /> },
  { title: "Add shortcut", detail: "Tap Add Shortcut at the bottom.", picture: <AddPicture /> },
  { title: "Use it from Share", detail: "In any app, tap Share, then Save to linkables.", picture: <SharePicture /> },
];

export function ShortcutGuide() {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {STEPS.map((step, index) => (
        <li key={step.title} className="flex gap-3 rounded-2xl bg-muted p-3 sm:flex-col sm:items-center sm:text-center">
          <span aria-hidden className="w-16 shrink-0 sm:w-20">
            {step.picture}
          </span>
          <span className="flex flex-col gap-1">
            <span className="text-[14.5px] font-bold">
              {index + 1}. {step.title}
            </span>
            <span className="text-[13px] leading-normal text-muted-foreground">{step.detail}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 64 96" className="h-auto w-full">
      <rect x="6" y="2" width="52" height="92" rx="10" className="fill-background stroke-line-strong" strokeWidth="2" />
      {children}
    </svg>
  );
}

function GetPicture() {
  return (
    <Phone>
      <rect x="14" y="18" width="36" height="5" rx="2.5" className="fill-accent" />
      <rect x="14" y="28" width="26" height="5" rx="2.5" className="fill-accent" />
      <rect x="14" y="62" width="36" height="12" rx="6" className="fill-primary" />
    </Phone>
  );
}

function AddPicture() {
  return (
    <Phone>
      <rect x="22" y="22" width="20" height="20" rx="6" className="fill-primary" />
      <rect x="18" y="48" width="28" height="5" rx="2.5" className="fill-accent" />
      <rect x="12" y="74" width="40" height="11" rx="5.5" className="fill-soft-foreground" />
    </Phone>
  );
}

function SharePicture() {
  return (
    <Phone>
      <rect x="10" y="50" width="44" height="38" rx="7" className="fill-muted" />
      <rect x="14" y="56" width="10" height="10" rx="3" className="fill-accent" />
      <rect x="27" y="56" width="10" height="10" rx="3" className="fill-primary" />
      <rect x="40" y="56" width="10" height="10" rx="3" className="fill-accent" />
      <rect x="14" y="72" width="36" height="5" rx="2.5" className="fill-accent" />
    </Phone>
  );
}
