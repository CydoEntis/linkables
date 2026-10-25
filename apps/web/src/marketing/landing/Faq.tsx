import { SUPPORT_PAGE } from "../pages";

const QUESTIONS = [
  {
    q: "Is it free?",
    a: "Yes. Saving, searching and organising your links is free, and stays free. A paid Pro plan with extras like summaries may come later.",
  },
  {
    q: "Which devices does it work on?",
    a: "iPhone, iPad, Android, and linkables.app in any browser on any computer. Your links are the same on all of them. A Chrome extension is coming soon.",
  },
  {
    q: "Do I need an account?",
    a: "Yes, a free one, so your links follow you from your phone to your laptop. Sign in with Google or with a code we email you. There's no password.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your links are only visible to you. We don't show ads, track you, or sell anything you save.",
  },
  {
    q: "Can I export my links?",
    a: "Any time. Choose Export my links in your account menu and you get one file with every link, note and collection.",
  },
  {
    q: "Is there a Chrome extension or an iPhone app?",
    a: "Not yet. The Chrome extension is coming soon. On iPhone, the Save to linkables shortcut puts linkables in your Share menu today, and an App Store app is on the way.",
  },
];

// Native disclosures: the answers are in the HTML, readable without any script.
export function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-h" className="border-t border-border">
      <div className="lp-reveal mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] items-start gap-[clamp(24px,5vw,80px)] px-5 py-[clamp(56px,8vw,112px)]">
        <div className="flex flex-col gap-3.5">
          <h2 id="faq-h" className="font-display text-[clamp(34px,4.8vw,64px)] leading-none font-semibold tracking-[-0.05em]">
            Questions
          </h2>
          <p className="text-base text-muted-foreground">
            Something else?{" "}
            <a href={SUPPORT_PAGE.path} className="font-semibold text-primary hover:text-foreground">
              Get support
            </a>
            .
          </p>
        </div>
        <div className="flex flex-col">
          {QUESTIONS.map((item, index) => (
            <details key={item.q} className="lp-faq border-t border-line-strong" open={index === 0}>
              <summary className="flex min-h-[68px] cursor-pointer items-center justify-between gap-4 text-[19px] font-semibold">
                <h3>{item.q}</h3>
                <span aria-hidden className="lp-plus shrink-0 text-[26px] leading-none font-normal text-primary transition-transform duration-200">
                  +
                </span>
              </summary>
              <p className="mb-6 max-w-[620px] text-[16.5px] leading-[1.6] text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
