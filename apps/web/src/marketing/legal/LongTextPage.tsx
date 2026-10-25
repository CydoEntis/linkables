import type { ReactNode } from "react";
import { MarketingShell } from "../MarketingShell";

export type LongTextSection = { id: string; heading: string; body: ReactNode };

export type LongTextDoc = { title: string; updated: string; short: ReactNode[]; sections: LongTextSection[] };

export function LongTextPage({ doc }: { doc: LongTextDoc }) {
  return (
    <MarketingShell>
      <main className="mx-auto grid max-w-[1100px] items-start gap-14 px-5 pt-[clamp(40px,6vw,80px)] pb-[clamp(64px,8vw,112px)] min-[860px]:grid-cols-[200px_minmax(0,1fr)]">
        <nav aria-label="On this page" className="sticky top-[100px] hidden flex-col gap-0.5 text-sm min-[860px]:flex">
          <span className="px-2.5 pb-2 text-xs font-semibold tracking-[0.03em] text-subtle-foreground">ON THIS PAGE</span>
          {doc.sections.map((section) => (
            <a key={section.id} href={`#${section.id}`} className="flex min-h-[34px] items-center rounded-[9px] px-2.5 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
              {section.heading}
            </a>
          ))}
        </nav>
        <article className="flex min-w-0 max-w-[680px] flex-col gap-7">
          <header className="flex flex-col gap-2.5">
            <h1 className="font-display text-[clamp(34px,4.5vw,52px)] leading-[1.05] font-semibold tracking-[-0.04em]">{doc.title}</h1>
            <span className="text-sm text-muted-foreground">Last updated {doc.updated}</span>
          </header>
          <aside aria-labelledby="short-version" className="flex flex-col gap-2.5 rounded-[18px] bg-card px-6 py-[22px]">
            <h2 id="short-version" className="text-[13px] font-bold text-primary">
              The short version
            </h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-[18px] text-base leading-[1.55]">
              {doc.short.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </aside>
          {doc.sections.map((section) => (
            <section key={section.id} id={section.id} className="lp-prose flex scroll-mt-[90px] flex-col gap-3">
              <h2 className="text-2xl font-bold tracking-[-0.015em]">{section.heading}</h2>
              {section.body}
            </section>
          ))}
        </article>
      </main>
    </MarketingShell>
  );
}
