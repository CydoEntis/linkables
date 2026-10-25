import { Search } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

type Placement = { position: CSSProperties; rotate: number; enter: number; bob: number };

const PILL = "flex h-[34px] items-center whitespace-nowrap rounded-full bg-[#262626] px-3.5 text-[13px] font-semibold text-soft-foreground shadow-[0_0_0_1px_#303030,0_18px_36px_-14px_rgb(0_0_0/0.9)]";
const PAPER = "bg-[#f1efe6] text-[#2a2a26] shadow-[0_24px_50px_-20px_rgb(0_0_0/0.9)]";

// Today's mess around the app window: chats with yourself, tabs, notes. Wide screens only.
export function MessCards() {
  return (
    <div aria-hidden className="hidden min-[980px]:block">
      <Card position={{ left: "1%", top: 14 }} rotate={-6} enter={0.7} bob={7}>
        <div className="flex w-[270px] flex-col gap-1.5 rounded-2xl bg-[#1b1b1f] p-3.5 text-left font-mono text-[11.5px] shadow-[0_0_0_1px_#26262c,0_24px_50px_-20px_rgb(0_0_0/0.9)]">
          <span className="font-sans text-xs font-bold text-[#9aa0ff]">#links-for-me</span>
          <span className="self-start rounded-[10px] bg-[#26262c] px-[9px] py-1.5 text-[#8fb6ff]">youtube.com/watch?v=x8J…</span>
          <span className="self-start rounded-[10px] bg-[#26262c] px-[9px] py-1.5 font-sans text-[12.5px]">watch this later!!</span>
        </div>
      </Card>
      <Card position={{ left: "9%", top: 156 }} rotate={6} enter={1.16} bob={7.8}>
        <span className={PILL}>which tab was it?</span>
      </Card>
      <Card position={{ left: 0, top: 214 }} rotate={3} enter={0.85} bob={8}>
        <div className={`flex w-[250px] flex-col gap-1.5 rounded-[14px] px-4 py-3.5 text-left ${PAPER}`}>
          <span className="text-[13px] font-bold">Notes · links??</span>
          <span className="font-mono text-[11px]">https://bit.ly/3xK9q</span>
          <span className="font-mono text-[11px]">https://japan-guide.com/e/e2…</span>
        </div>
      </Card>
      <Card position={{ left: "7%", top: 332 }} rotate={-7} enter={0.92} bob={6.5}>
        <span className={`${PILL} h-[38px] px-4 text-sm`}>where was that video?</span>
      </Card>
      <Card position={{ right: "1%", top: 8 }} rotate={5} enter={0.78} bob={7.5}>
        <TabsCard />
      </Card>
      <Card position={{ right: "7%", top: 128 }} rotate={4} enter={1} bob={7.2}>
        <span className="block w-[210px] rounded-[18px_18px_4px_18px] bg-[#2f6df6] px-3.5 py-2.5 text-left text-[13.5px] leading-[1.35] font-medium text-white shadow-[0_18px_36px_-14px_rgb(0_0_0/0.9)]">
          can u send me that ramen place again?
        </span>
      </Card>
      <Card position={{ right: 0, top: 212 }} rotate={-5} enter={1.24} bob={6.8}>
        <span className={`flex h-[34px] items-center gap-[7px] whitespace-nowrap rounded-[10px] px-3 text-[12.5px] font-bold ${PAPER}`}>
          <span className="font-medium text-[#5f5f58]">Fwd:</span>link for later
        </span>
      </Card>
      <Card position={{ right: "9%", top: 274 }} rotate={-3} enter={1.08} bob={8.4}>
        <span className="flex h-10 items-center gap-[9px] whitespace-nowrap rounded-xl bg-[#1d1d1d] px-3.5 text-[13px] text-soft-foreground shadow-[0_0_0_1px_#2c2c2c,0_18px_36px_-14px_rgb(0_0_0/0.9)]">
          <Search className="size-[13px]" />
          "curry recipe" site:???
        </span>
      </Card>
    </div>
  );
}

function Card({ children, ...placement }: Placement & { children: ReactNode }) {
  return (
    <div className="lp-chip-in absolute z-[1]" style={{ ...placement.position, animationDelay: `${String(placement.enter)}s` }}>
      <div
        className="lp-bob"
        style={{ rotate: `${String(placement.rotate)}deg`, animationDuration: `${String(placement.bob)}s`, animationDelay: `${String(placement.enter + 0.8)}s` }}
      >
        {children}
      </div>
    </div>
  );
}

function TabsCard() {
  return (
    <div className="w-[250px] rounded-[14px] bg-[#1d1d1d] px-2.5 pt-2.5 pb-3.5 text-left shadow-[0_0_0_1px_#262626,0_24px_50px_-20px_rgb(0_0_0/0.9)]">
      <div className="flex gap-0.5 overflow-hidden">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} className="flex h-[18px] flex-[1_0_13px] items-center justify-center rounded-t bg-muted">
            <span className="size-1.5 rounded-[2px]" style={{ background: `oklch(0.6 0.12 ${String((i * 53) % 360)})` }} />
          </span>
        ))}
      </div>
      <div className="flex items-baseline gap-2 px-1 pt-2.5">
        <span className="font-display text-[32px] leading-none font-semibold tracking-[-0.04em]">87</span>
        <span className="text-[13px] text-muted-foreground">tabs open</span>
      </div>
    </div>
  );
}
