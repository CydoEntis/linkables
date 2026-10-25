import { useEffect, useRef, type ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "../shell/Wordmark";

// The legal and help pages arrive later; until then these are plain links.
const FOOTER_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/support", label: "Help" },
];

export const PRIMARY_BUTTON = buttonVariants({ size: "xl", className: "w-full" });

export const FILLED_FIELD =
  "w-full rounded-xl bg-muted text-foreground outline-none aria-invalid:shadow-[0_0_0_2px_var(--destructive)] data-shaking:animate-shake";

// step keys the column so each step rises in afresh.
type SignInLayoutProps = { step: string; offline: boolean; children: ReactNode };

export function SignInLayout({ step, offline, children }: SignInLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex h-[68px] w-full max-w-[1200px] flex-none items-center justify-between px-5">
        <a href="/" aria-label="linkables home" className="rounded-sm">
          <Wordmark />
        </a>
        <a href="/" className="flex h-10 items-center rounded-md px-3 text-[14.5px] text-muted-foreground hover:bg-muted hover:text-foreground">
          ← Back to home
        </a>
      </header>
      {offline ? <OfflineBanner /> : null}
      <main className="flex flex-1 items-center justify-center px-5 pt-6 pb-16">
        <div key={step} className="flex w-full max-w-[400px] animate-rise flex-col gap-6">{children}</div>
      </main>
      <footer className="flex justify-center gap-5 p-5 text-[13.5px]">
        {FOOTER_LINKS.map(({ href, label }) => (
          <a key={href} href={href} className="text-subtle-foreground hover:text-foreground">
            {label}
          </a>
        ))}
      </footer>
    </div>
  );
}

function OfflineBanner() {
  return (
    <div role="status" className="mx-auto mb-2 flex w-[calc(100%-40px)] max-w-[440px] animate-fade-in items-center gap-2.5 rounded-lg bg-muted px-3.5 py-2.5 text-sm">
      <span aria-hidden className="size-2 flex-none rounded-full bg-destructive" />
      You're offline. Check your connection and try again.
    </div>
  );
}

type StepHeadingProps = {
  title: string;
  description: ReactNode;
  // Set when this step replaces another, so screen readers land on the new step.
  focus?: boolean;
};

export function StepHeading({ title, description, focus = false }: StepHeadingProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focus) headingRef.current?.focus();
  }, [focus]);

  return (
    <div className="flex flex-col gap-2.5">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-[clamp(30px,6vw,40px)] leading-[1.05] font-semibold tracking-[-0.045em] outline-none"
      >
        {title}
      </h1>
      <p className="text-[16.5px] leading-normal text-muted-foreground">{description}</p>
    </div>
  );
}
