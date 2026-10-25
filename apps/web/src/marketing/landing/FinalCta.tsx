import { INVITE_ONLY } from "../../config/access";
import { PrimaryCta } from "../cta";

export function FinalCta() {
  return (
    <section aria-labelledby="cta-h" className="overflow-hidden border-t border-border">
      <div className="lp-reveal mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-10 px-5 py-[clamp(64px,9vw,128px)]">
        <div className="flex max-w-[760px] flex-col gap-7">
          <h2 id="cta-h" className="font-display text-[clamp(40px,7vw,96px)] leading-[0.98] font-semibold tracking-[-0.055em]">
            Close the tabs.
            <br />
            <span className="text-primary">Keep the links.</span>
          </h2>
          <div className="flex flex-col gap-3">
            <PrimaryCta className="self-start" />
            {INVITE_ONLY ? (
              <p className="text-base text-muted-foreground">
                linkables is in private beta. Already invited?{" "}
                <a href="/sign-in" className="font-semibold text-primary hover:text-foreground">
                  Sign in
                </a>
                .
              </p>
            ) : null}
          </div>
        </div>
        <div aria-hidden className="relative hidden h-[260px] w-[300px] shrink-0 min-[1120px]:block">
          <span className="absolute top-0 right-0 size-[180px] rotate-[9deg] rounded-[48px] bg-primary" />
          <span className="absolute bottom-0 left-0 size-[200px] rounded-[54px] bg-foreground shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)]" />
        </div>
      </div>
    </section>
  );
}
