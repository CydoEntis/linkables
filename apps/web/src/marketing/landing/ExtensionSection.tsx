import { Check, PanelRight, Pin, Search, Share } from "lucide-react";
import type { ReactNode } from "react";
import { Mark } from "../Mark";
import { FeatureList } from "./FeatureList";
import { type MockLink, MockRow, Tile } from "./MockRow";

const PANEL_ROWS: (MockLink & { pinned?: boolean })[] = [
  { title: "Kyoto: Fushimi Inari, early morning", site: "japan-guide.com", meta: "Trip to Japan", pinned: true },
  { title: "The only carbonara recipe you need", site: "youtube.com", meta: "Recipes", video: true, pinned: true },
  { title: "Tokyo night walk: Shinjuku in the rain", site: "youtube.com", meta: "35m", video: true },
  { title: "Crispy gyoza at home, step by step", site: "youtube.com", meta: "2h", video: true },
  { title: "Japanese curry from scratch", site: "seriouseats.com", meta: "3h" },
];

const COLLECTIONS = [
  { name: "Trip to Japan", sites: ["japan-guide.com", "tokyocheapo.com", "jnto.go.jp", "youtube.com"], ticked: true },
  { name: "Tokyo eats", sites: ["tokyocheapo.com", "seriouseats.com", "tabelog.com", "youtube.com"], ticked: false },
  { name: "Recipes", sites: ["seriouseats.com", "youtube.com", "bonappetit.com", "nytimes.com"], ticked: false },
];

export function ExtensionSection() {
  return (
    <section id="extension" aria-labelledby="ext-h" className="border-t border-border">
      <div className="lp-reveal mx-auto grid max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] items-center gap-[clamp(40px,6vw,88px)] px-5 py-[clamp(64px,9vw,128px)]">
        <div className="flex min-w-0 flex-col gap-[22px]">
          <span className="flex h-7 items-center self-start rounded-full bg-muted px-[11px] text-[12.5px] font-bold text-muted-foreground">Coming soon</span>
          <h2 id="ext-h" className="font-display text-[clamp(34px,4.8vw,64px)] leading-none font-semibold tracking-[-0.05em]">
            One click
            <br />
            in Chrome.
          </h2>
          <p className="max-w-[480px] text-lg leading-[1.55] text-pretty text-muted-foreground">
            The Chrome extension is on its way. Click Save in the toolbar and the page is saved. Pin it, share it, or drop it in a collection, and open the
            side panel to browse your links next to whatever you're reading.
          </p>
          <FeatureList
            items={[
              ["Quietly", "Alt+Shift+S saves without opening anything."],
              ["Side panel", "Search, pinned and collections, beside the page."],
              ["Collections", "File it as you save, or skip it and sort later."],
            ]}
          />
        </div>
        <figure
          role="img"
          aria-label="The coming linkables extension: the Saved pop-up with Pin, Share and collections, over the side panel with your recent links"
          className="relative min-h-[760px] min-w-0 min-[900px]:min-h-[600px]"
        >
          <SidePanel />
          <SavedPopup />
        </figure>
      </div>
    </section>
  );
}

function SidePanel() {
  return (
    <div className="lp-chip-in absolute top-0 right-0 flex w-[min(100%,340px)] flex-col gap-2.5 rounded-[20px] bg-[#151515] px-3 py-3.5 shadow-[0_0_0_1px_#262626,0_40px_80px_-30px_rgb(0_0_0/0.95)]">
      <div className="flex items-center gap-2 px-1">
        <Mark size={20} />
        <span className="flex-1 font-display text-[15px] font-semibold tracking-[-0.03em]">linkables</span>
        <span className="text-xs text-subtle-foreground">Side panel</span>
      </div>
      <span className="flex h-9 items-center gap-2 rounded-[11px] bg-muted px-3 text-[12.5px] text-subtle-foreground">
        <Search aria-hidden className="size-[13px]" />
        Search your links
      </span>
      <div className="flex gap-1 text-xs font-semibold">
        <span className="flex h-7 items-center rounded-lg bg-accent px-[11px]">Recent</span>
        <span className="flex h-7 items-center px-[11px] text-muted-foreground">Pinned</span>
        <span className="flex h-7 items-center px-[11px] text-muted-foreground">Collections</span>
      </div>
      <div className="flex flex-col">
        {PANEL_ROWS.map((link) => (
          <MockRow
            key={link.meta + link.site}
            link={link}
            size="sm"
            trailing={link.pinned ? <Pin aria-hidden className="size-3 shrink-0 fill-muted-foreground text-muted-foreground" /> : null}
          />
        ))}
      </div>
    </div>
  );
}

function SavedPopup() {
  return (
    <div className="lp-chip-in absolute top-[150px] left-0 z-[2] w-[min(92%,330px)] max-[900px]:top-[330px]" style={{ animationDelay: "0.35s" }}>
      <div className="lp-bob flex flex-col gap-3 rounded-[20px] bg-card p-4 shadow-[0_0_0_1px_#2c2c2c,0_50px_90px_-30px_rgb(0_0_0)]" style={{ rotate: "-2deg", animationDuration: "8s" }}>
        <div className="flex items-center gap-[11px]">
          <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Check aria-hidden className="size-[18px]" strokeWidth={3} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-bold">Saved</span>
            <span className="truncate text-[11.5px] text-muted-foreground">Best ramen in Tokyo under ¥1000</span>
          </span>
          <Tile site="tokyocheapo.com" className="h-8 w-12 rounded-lg text-[11px]" />
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-[11.5px] font-semibold">
          <PopupTile icon={<Pin aria-hidden className="size-[15px]" />} label="Pin" />
          <PopupTile icon={<Share aria-hidden className="size-[15px]" />} label="Share" />
          <PopupTile icon={<PanelRight aria-hidden className="size-[15px]" />} label="All links" />
        </div>
        <span className="px-0.5 text-[11.5px] font-semibold text-muted-foreground">Add to a collection · optional</span>
        <div className="-mx-1 -mt-1 flex flex-col">
          {COLLECTIONS.map((collection) => (
            <div key={collection.name} className={`flex items-center gap-[11px] rounded-[10px] px-1.5 py-[7px] ${collection.ticked ? "bg-[#232323]" : ""}`}>
              <span className="grid size-7 shrink-0 grid-cols-2 gap-px overflow-hidden rounded-[7px] bg-accent">
                {collection.sites.map((site) => (
                  <Tile key={site} site={site} className="text-[0px]" />
                ))}
              </span>
              <span className="flex-1 text-[13.5px] font-semibold">{collection.name}</span>
              <span className={`flex size-5 items-center justify-center rounded-full ${collection.ticked ? "bg-primary text-primary-foreground" : "bg-accent"}`}>
                {collection.ticked ? <Check aria-hidden className="size-3" strokeWidth={3.5} /> : null}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[#262626] pt-2.5">
          <span className="text-[11.5px] text-subtle-foreground">Alt+Shift+S saves quietly</span>
          <span className="flex h-8 items-center rounded-[9px] bg-foreground px-3.5 text-[12.5px] font-bold text-background">Done</span>
        </div>
      </div>
    </div>
  );
}

function PopupTile({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="flex h-[52px] flex-col items-center justify-center gap-1 rounded-xl bg-muted">
      {icon}
      {label}
    </span>
  );
}
