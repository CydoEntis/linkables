import { PRIVACY_PAGE } from "../pages";

export function PrivacySection() {
  return (
    <section aria-labelledby="priv-h" className="border-t border-border">
      <div className="lp-reveal mx-auto flex max-w-[1280px] flex-col gap-7 px-5 py-[clamp(64px,9vw,128px)]">
        <h2
          id="priv-h"
          className="max-w-[1100px] text-[clamp(30px,4.6vw,62px)] leading-[1.15] font-semibold tracking-[-0.035em] text-pretty text-subtle-foreground"
        >
          <span className="text-foreground">No ads.</span> <span className="text-foreground">No tracking.</span> Nobody sees your links but{" "}
          <span className="text-primary">you</span>, and you can <span className="text-foreground">take them with you</span> whenever you like.
        </h2>
        <p className="text-base text-muted-foreground">
          The details are in the{" "}
          <a href={PRIVACY_PAGE.path} className="font-semibold text-primary hover:text-foreground">
            privacy policy
          </a>
          , written in plain English.
        </p>
      </div>
    </section>
  );
}
