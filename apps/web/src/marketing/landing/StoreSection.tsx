import { cn } from "cn";
import type { StoreCard } from "./stores";

export function StoreSection({ cards }: { cards: StoreCard[] }) {
  return (
    <section id="download" aria-labelledby="dl-h" className="bg-primary text-primary-foreground">
      <div className="lp-reveal mx-auto max-w-[1280px] px-5 py-[clamp(56px,8vw,112px)]">
        <div className="mb-[clamp(28px,4vw,48px)] flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <h2 id="dl-h" className="max-w-[760px] font-display text-[clamp(34px,5.4vw,72px)] leading-none font-semibold tracking-[-0.05em]">
            Save from whatever's in your hand.
          </h2>
          <p className="max-w-[340px] text-[17px] leading-normal text-[#2b3a12]">iPhone, Android, Chrome and the web. They all land in the same place.</p>
        </div>
        <div className="flex flex-col border-t-2 border-primary-foreground">
          {cards.map((card) => (
            <StoreRow key={card.key} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StoreRow({ card }: { card: StoreCard }) {
  const available = card.cta !== null;
  return (
    <article
      data-state={available ? "available" : "coming-soon"}
      className={cn(
        "lp-store-row grid items-center gap-x-7 gap-y-3.5 border-b border-[rgb(22_32_10/0.28)] py-6 min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_300px]",
        !available && "opacity-60",
      )}
    >
      <h3 className="font-display text-[clamp(22px,2.4vw,32px)] leading-[1.1] font-semibold tracking-[-0.04em]">{card.name}</h3>
      <p className="text-[16.5px] leading-normal text-[#2b3a12]">{card.body}</p>
      <div className="flex flex-wrap items-center gap-2.5">
        <span
          className={cn(
            "flex h-7 items-center rounded-full px-[11px] text-[12.5px] font-bold",
            available ? "bg-primary-foreground text-primary" : "bg-[rgb(22_32_10/0.12)]",
          )}
        >
          {available ? "Available now" : "Coming soon"}
        </span>
        {card.cta ? (
          <a href={card.cta.href} className="lp-btn flex h-11 items-center rounded-xl bg-background px-[18px] text-[15px] font-bold text-foreground hover:brightness-125">
            {card.cta.label}
          </a>
        ) : null}
      </div>
    </article>
  );
}
