import { Pin, Search } from "lucide-react";
import { FeatureList } from "./FeatureList";
import { MockRow } from "./MockRow";

type Result = { before: string; after: string; site: string; meta: string; video?: boolean };

const PINNED: Result = { before: "Best ", after: " in Tokyo under ¥1000", site: "tokyocheapo.com", meta: "in Trip to Japan" };

const RESULTS: Result[] = [
  { before: "Kyoto ", after: ": the 10 best bowls", site: "kyoto-ramen.jp", meta: "in Trip to Japan" },
  { before: "Tonkotsu ", after: " at home, 3 ways", site: "youtube.com", meta: "in Recipes", video: true },
  { before: "Why ", after: " shops have ticket machines", site: "japan-guide.com", meta: "New" },
];

function ResultRow({ result, pinned = false }: { result: Result; pinned?: boolean }) {
  const title = (
    <>
      {result.before}
      <mark className="rounded-[3px] bg-primary px-px text-primary-foreground">ramen</mark>
      {result.after}
    </>
  );
  return (
    <MockRow
      link={{ ...result, title }}
      size="sm"
      className={pinned ? "bg-muted" : ""}
      trailing={pinned ? <Pin aria-hidden className="size-[13px] shrink-0 fill-muted-foreground text-muted-foreground" /> : null}
    />
  );
}

const GROUP = "px-1.5 pt-2 text-[11.5px] font-semibold tracking-[0.03em] text-subtle-foreground";

export function FindSection() {
  return (
    <section aria-labelledby="find-h" className="border-t border-border bg-[#161616]">
      <div className="lp-reveal mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-[clamp(40px,6vw,88px)] px-5 py-[clamp(64px,9vw,128px)]">
        <div className="flex min-w-0 flex-col gap-[22px]">
          <h2 id="find-h" className="font-display text-[clamp(34px,4.8vw,64px)] leading-none font-semibold tracking-[-0.05em]">
            Type a word.
            <br />
            There it is.
          </h2>
          <FeatureList
            items={[
              ["Search", "Titles, descriptions, sites and the link itself."],
              ["Collections", "One link can live in several."],
              ["Pins", "Pinned links always come first."],
              ["Anywhere", "Save on your phone, find it on your laptop."],
            ]}
          />
        </div>
        <figure role="img" aria-label="Searching linkables for ramen, with the pinned link first" className="relative min-w-0 pt-2.5 pr-2 pb-[22px] pl-[18px]">
          <span aria-hidden className="absolute inset-[0_8%_4%_0] rotate-[-5deg] rounded-[32px] bg-accent" />
          <div className="relative flex rotate-1 flex-col gap-2.5 rounded-[22px] bg-sidebar p-[18px] shadow-[0_0_0_1px_var(--line-strong),0_40px_80px_-30px_rgb(0_0_0/0.9)] transition-transform duration-300 hover:-translate-y-1 hover:rotate-0">
            <div className="flex h-12 items-center gap-2.5 rounded-[14px] bg-muted px-3.5 text-base shadow-[0_0_0_2px_var(--foreground)]">
              <Search aria-hidden className="size-[15px] text-muted-foreground" />
              <span>ramen</span>
              <span className="h-[18px] w-[1.5px] bg-foreground" />
            </div>
            <span className={GROUP}>PINNED</span>
            <ResultRow result={PINNED} pinned />
            <span className={GROUP}>RESULTS</span>
            {RESULTS.map((result) => (
              <ResultRow key={result.site} result={result} />
            ))}
          </div>
        </figure>
      </div>
    </section>
  );
}
