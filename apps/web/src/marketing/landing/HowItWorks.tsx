import { Search, Share } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "cn";

function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex h-[1.15em] items-center gap-[0.25em] rounded-[0.3em] bg-accent px-[0.38em] align-[0.08em] text-[0.82em] text-foreground", className)}>
      {children}
    </span>
  );
}

export function HowItWorks() {
  return (
    <section id="how" aria-labelledby="how-h" className="border-t border-border">
      <div className="lp-reveal mx-auto max-w-[1280px] px-5 py-[clamp(64px,9vw,128px)]">
        <h2 id="how-h" className="sr-only">
          How it works
        </h2>
        <p className="max-w-[1100px] text-[clamp(28px,4.3vw,58px)] leading-[1.28] font-semibold tracking-[-0.03em] text-pretty text-subtle-foreground">
          <span className="text-foreground">Tap</span>{" "}
          <Chip>
            <Share aria-hidden className="size-[0.8em]" strokeWidth={2.4} />
            Share
          </Chip>{" "}
          <span className="text-foreground">in any app and pick linkables.</span> It shows up in{" "}
          <Chip className="pr-[0.2em]">
            New
            <span className="inline-flex h-[0.85em] min-w-[0.85em] items-center justify-center rounded-full bg-primary px-[0.22em] text-[0.6em] font-extrabold text-primary-foreground">1</span>
          </Chip>{" "}
          with its title and picture. <span className="text-foreground">Weeks later, type</span>{" "}
          <Chip className="shadow-[0_0_0_0.06em_var(--foreground)]">
            <Search aria-hidden className="size-[0.7em]" strokeWidth={2.6} />
            ramen
          </Chip>{" "}
          <span className="text-foreground">and there it is.</span>
        </p>
      </div>
    </section>
  );
}
