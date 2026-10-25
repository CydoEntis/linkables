import { ArrowRight } from "lucide-react";
import { cn } from "cn";

export function GetStarted({ className }: { className?: string }) {
  return (
    <a
      href="/sign-in"
      className={cn(
        "lp-btn lp-btn-primary h-[60px] gap-3.5 rounded-2xl bg-primary pr-[15px] pl-[26px] text-[17.5px] font-bold text-primary-foreground",
        className,
      )}
    >
      Get started, it's free
      <span aria-hidden className="lp-arrow flex size-[30px] shrink-0 items-center justify-center rounded-full bg-primary-foreground text-primary">
        <ArrowRight className="size-[15px]" strokeWidth={2.8} />
      </span>
    </a>
  );
}
