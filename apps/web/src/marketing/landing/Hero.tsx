import type { CSSProperties, ReactNode } from "react";
import { GetStarted } from "./cta";
import { HeroPicture } from "./HeroPicture";

const delay = (seconds: number): CSSProperties => ({ animationDelay: `${String(seconds)}s` });

function Word({ at, className, children }: { at: number; className?: string; children: ReactNode }) {
  return (
    <span className={`lp-word ${className ?? ""}`} style={delay(at)}>
      {children}
    </span>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,#1b1b1b_0%,transparent_70%)]">
      <div aria-hidden className="lp-dots pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex max-w-[1280px] flex-col items-center px-5 pt-[clamp(56px,8vw,112px)] text-center">
        <a
          href="#phone"
          className="lp-in flex min-h-[34px] items-center gap-2.5 rounded-full bg-[#1d1d1d] py-1 pr-1.5 pl-3.5 text-[13.5px] font-semibold text-soft-foreground shadow-[inset_0_0_0_1px_#2a2a2a] hover:bg-[#242424] hover:text-foreground"
        >
          New: save from your phone's Share menu
          <span className="flex h-6 shrink-0 items-center rounded-full bg-line-strong px-[9px] text-xs text-foreground">See how →</span>
        </a>
        <h1 className="mt-[clamp(22px,3vw,32px)] max-w-[1180px] font-display text-[clamp(42px,7.4vw,108px)] leading-[0.98] font-semibold tracking-[-0.055em] text-balance">
          <Word at={0.05} className="relative">
            Never
            <svg aria-hidden viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute bottom-[-0.12em] left-[-2%] h-[0.2em] w-[104%] overflow-visible">
              <path className="lp-draw" d="M4 16 C 70 6, 150 4, 296 12" fill="none" stroke="var(--primary)" strokeWidth="9" strokeLinecap="round" pathLength={1} />
            </svg>
          </Word>{" "}
          <Word at={0.13}>lose</Word> <Word at={0.21}>a</Word>{" "}
          <Word at={0.29} className="text-primary">
            link
          </Word>{" "}
          <br />
          <Word at={0.37}>again.</Word>
        </h1>
        <p className="lp-in mt-[clamp(20px,2.4vw,28px)] max-w-[820px] text-[clamp(18px,1.6vw,21px)] leading-normal text-pretty text-soft-foreground" style={delay(0.45)}>
          Save links from your phone or your browser in one tap. Find them on any device, any time.
        </p>
        <div className="lp-in mt-[clamp(28px,3vw,36px)] flex flex-wrap justify-center gap-3" style={delay(0.55)}>
          <GetStarted />
          <a href="#how" className="lp-btn lp-btn-ghost h-[60px] rounded-2xl bg-[#262626] hover:bg-accent px-6 text-[16.5px] font-semibold">
            How it works
          </a>
        </div>
        <p className="lp-in mt-[18px] flex flex-wrap justify-center gap-x-[18px] gap-y-1.5 text-[13.5px] text-subtle-foreground" style={delay(0.65)}>
          <span>Free forever</span>
          <span>No password</span>
          <span>Web, iPhone and Android</span>
        </p>
      </div>
      <HeroPicture />
    </section>
  );
}
