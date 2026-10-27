import { ChevronDown, Pin, Plus, Search, Share, Trash2 } from "lucide-react";
import { MarkWordmark } from "../Mark";
import { FeatureList } from "./FeatureList";
import { type MockLink, MockRow, Tile } from "./MockRow";

const SWIPED: MockLink = { title: "Best ramen in Tokyo under ¥1000", site: "tokyocheapo.com", meta: "Trip to Japan" };

const ROWS: MockLink[] = [
  { title: "Tokyo night walk: Shinjuku in the rain", site: "youtube.com", meta: "from iPhone", video: true },
  { title: "Crispy gyoza at home", site: "youtube.com", meta: "Recipes", video: true },
  { title: "Japanese curry from scratch", site: "seriouseats.com", meta: "New" },
  { title: "How kangaroos actually hop", site: "nationalgeographic.com", meta: "New" },
  { title: "A beginner's guide to film cameras", site: "theverge.com", meta: "Hobbies" },
  { title: "Kyoto in two days: a walking plan", site: "lonelyplanet.com", meta: "Trip to Japan" },
  { title: "Sourdough starter, day by day", site: "kingarthurbaking.com", meta: "Recipes" },
  { title: "The case for a four-day week", site: "bbc.com", meta: "Reading" },
  { title: "Lo-fi beats to focus to", site: "youtube.com", meta: "Music", video: true },
];

export function PhoneSection() {
  return (
    <section id="phone" aria-labelledby="phone-h" className="border-t border-border bg-[#161616]">
      <div className="lp-reveal mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-center gap-[clamp(40px,6vw,88px)] px-5 py-[clamp(64px,9vw,128px)]">
        <div className="flex min-w-0 flex-col gap-[22px]">
          <h2 id="phone-h" className="font-display text-[clamp(34px,4.8vw,64px)] leading-none font-semibold tracking-[-0.05em]">
            Two taps
            <br />
            on your phone.
          </h2>
          <p className="max-w-[480px] text-lg leading-[1.55] text-pretty text-muted-foreground">
            linkables shows up in Share in every app. Watching something on YouTube? Share, linkables, done.
          </p>
          <FeatureList
            items={[
              ["Swipe", "Swipe a link left to file, share, pin or delete it."],
              ["Android", "Install it from Chrome in one tap."],
              ["iPhone", "Add the Save to linkables shortcut. An App Store app is on the way."],
            ]}
          />
        </div>
        <PhonePicture />
      </div>
    </section>
  );
}

function PhonePicture() {
  return (
    <figure
      role="img"
      aria-label="linkables on a phone: a list of saved links, one swiped left to show Add to, Share, Pin and Delete"
      className="mx-auto aspect-[9/19.5] w-full max-w-[320px] rounded-[52px] bg-[#050505] p-2.5 shadow-[0_0_0_1px_#2a2a2a,0_50px_100px_-30px_rgb(0_0_0/0.9)]"
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[42px] bg-background px-3.5">
        <div className="flex h-11 shrink-0 items-center justify-between px-3 text-[12px] font-semibold">
          <span>9:41</span>
          <span className="h-[22px] w-[84px] rounded-full bg-black" />
          <span className="w-[30px]" />
        </div>
        <div className="flex items-center justify-between px-1 pb-3">
          <MarkWordmark size={20} textClass="text-[15px]" />
          <span className="flex size-8 items-center justify-center rounded-full bg-muted text-[13px] font-bold">A</span>
        </div>
        <span className="flex h-11 shrink-0 items-center gap-2 rounded-[14px] bg-muted px-3.5 text-[13.5px] text-subtle-foreground">
          <Search aria-hidden className="size-3.5" />
          Search your links
        </span>
        <div className="flex gap-1.5 py-3 text-[12.5px] font-semibold">
          <span className="flex h-8 items-center gap-1 rounded-full bg-accent px-3">
            All links <ChevronDown aria-hidden className="size-3" />
          </span>
          <span className="flex h-8 items-center rounded-full bg-muted px-3">Pinned</span>
          <span className="flex h-8 items-center gap-1.5 rounded-full bg-muted px-3">
            New <span className="rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">2</span>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <SwipedRow />
          {ROWS.map((link) => (
            <MockRow key={link.meta + link.site} link={link} size="sm" />
          ))}
        </div>
        <span className="absolute right-4 bottom-8 flex size-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-fab">
          <Plus aria-hidden className="size-6" strokeWidth={2.6} />
        </span>
        <span className="absolute bottom-2 left-1/2 h-[5px] w-[120px] -translate-x-1/2 rounded-full bg-foreground/85" />
      </div>
    </figure>
  );
}

const TILE = "flex w-12 flex-col items-center justify-center gap-1 text-[10px] font-semibold";

function SwipedRow() {
  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex">
        <span className={`${TILE} bg-primary text-primary-foreground`}><Plus aria-hidden className="size-4" />Add to</span>
        <span className={`${TILE} bg-accent`}><Share aria-hidden className="size-4" />Share</span>
        <span className={`${TILE} bg-accent`}><Pin aria-hidden className="size-4" />Pin</span>
        <span className={`${TILE} bg-destructive-solid text-white`}><Trash2 aria-hidden className="size-4" />Delete</span>
      </div>
      <div className="lp-swipe relative flex items-center gap-[11px] bg-background px-2 py-[7px]">
        <Tile site={SWIPED.site} className="h-[34px] w-[52px] rounded-lg text-[11px]" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[13px] font-semibold">{SWIPED.title}</span>
          <span className="truncate text-[11px] text-muted-foreground">
            {SWIPED.site} · {SWIPED.meta}
          </span>
        </span>
      </div>
    </div>
  );
}
