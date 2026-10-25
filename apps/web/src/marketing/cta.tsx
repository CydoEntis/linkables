import { ArrowRight } from "lucide-react";
import { cn } from "cn";
import { INVITE_ONLY, primaryCta } from "../config/access";

export const CTA = primaryCta(INVITE_ONLY);

export function PrimaryCta({ className }: { className?: string }) {
  return (
    <a
      href={CTA.href}
      className={cn(
        "lp-btn lp-btn-primary h-[60px] gap-3.5 rounded-2xl bg-primary pr-[15px] pl-[26px] text-[17.5px] font-bold text-primary-foreground",
        className,
      )}
    >
      {CTA.longLabel}
      <span aria-hidden className="lp-arrow flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
        <ArrowRight className="size-[15px]" strokeWidth={2.8} />
      </span>
    </a>
  );
}

export function BetaPill({ className }: { className?: string }) {
  if (!INVITE_ONLY) return null;
  return (
    <span className={cn("flex h-7 shrink-0 items-center rounded-full bg-primary-soft px-3 text-[12.5px] font-bold text-primary", className)}>
      Private beta
    </span>
  );
}
