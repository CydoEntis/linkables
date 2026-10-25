import { ChevronDown, MousePointer2, Pin, Plus, Search, Share, Trash2 } from "lucide-react";
import { MessCards } from "./MessCards";
import { type MockLink, MockRow } from "./MockRow";

const NEW_LINK: MockLink = { title: "Baby kangaroo tries a trampoline", site: "youtube.com", meta: "just now · from iPhone", video: true };

const OLDER: MockLink[] = [
  { title: "Tokyo night walk: Shinjuku in the rain", site: "youtube.com", meta: "35m · from iPhone", video: true },
  { title: "Crispy gyoza at home, step by step", site: "youtube.com", meta: "2h", video: true },
  { title: "Japanese curry from scratch", site: "seriouseats.com", meta: "3h" },
  { title: "Kyoto: Fushimi Inari, early morning", site: "japan-guide.com", meta: "1d" },
];

const ACTION = "flex size-8 items-center justify-center rounded-[9px] bg-line-strong";

export function HeroPicture() {
  return (
    <div className="relative mx-auto mt-[clamp(48px,6vw,80px)] max-w-[1180px] px-5 min-[980px]:h-[500px]">
      <MessCards />
      <figure
        role="img"
        aria-label="linkables: a video shared from a phone lands at the top of New"
        className="lp-rise relative z-[2] mx-auto w-full max-w-[600px] overflow-hidden rounded-[22px] bg-sidebar text-left shadow-[0_0_0_1px_var(--line-strong),0_60px_120px_-40px_rgb(0_0_0/0.95)]"
      >
        <div className="flex h-9 items-center gap-1.5 border-b border-border bg-[#0a0a0a] px-3.5">
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="size-2.5 rounded-full bg-line-strong" />
          <span className="mx-auto flex h-[22px] max-w-[220px] flex-1 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-subtle-foreground">
            linkables.app
          </span>
          <span className="w-[46px]" />
        </div>
        <div className="flex flex-col bg-background px-4 pt-5 pb-[18px]">
          <div className="flex items-center gap-2 px-1 pb-4">
            <span className="flex h-[38px] min-w-0 flex-1 items-center gap-[9px] rounded-[11px] bg-muted px-3 text-[13px] text-subtle-foreground">
              <Search aria-hidden className="size-3.5" />
              <span className="flex-1 truncate">Search or paste a link</span>
              <span className="rounded-[5px] bg-accent px-1.5 py-0.5 font-mono text-[10.5px] text-soft-foreground">⌘K</span>
            </span>
            <span className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-[11px] bg-muted px-3 text-[13px] font-semibold">
              Newest
              <ChevronDown aria-hidden className="size-3" />
            </span>
          </div>
          <div className="flex items-center justify-between px-2 pb-2.5">
            <span className="text-[22px] font-bold tracking-[-0.02em]">New</span>
            <span className="text-[13px] text-muted-foreground">5 links</span>
          </div>
          <div className="lp-drop overflow-hidden">
            <div className="relative">
              <MockRow link={NEW_LINK} className="bg-[#1d1d1d]" />
              <span className="lp-fade-actions absolute top-1/2 right-2.5 flex -translate-y-1/2 gap-1.5 bg-[linear-gradient(90deg,transparent,#1d1d1d_34px)] pl-[34px] max-[480px]:hidden">
                <span className="flex h-8 items-center gap-1 rounded-[9px] bg-primary px-[11px] text-xs font-bold text-primary-foreground">
                  <Plus aria-hidden className="size-3" strokeWidth={3} />
                  Add to
                </span>
                <span className={ACTION}><Share aria-hidden className="size-[13px]" /></span>
                <span className={ACTION}><Pin aria-hidden className="size-[13px]" /></span>
                <span className={ACTION}><Trash2 aria-hidden className="size-[13px]" /></span>
              </span>
              <MousePointer2 aria-hidden className="lp-fade-actions absolute top-[62%] right-[58px] size-[18px] fill-white text-background max-[480px]:hidden" />
            </div>
          </div>
          {OLDER.map((link) => (
            <MockRow key={link.meta + link.site} link={link} />
          ))}
        </div>
      </figure>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[140px] bg-[linear-gradient(transparent,var(--background))]" />
    </div>
  );
}
