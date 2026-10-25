import { Menu } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { BetaPill, CTA } from "./cta";
import { MarkWordmark } from "./Mark";

const NAV = [
  { label: "How it works", href: "/#how" },
  { label: "Phone", href: "/#phone" },
  { label: "Extension", href: "/#extension" },
  { label: "Download", href: "/#download" },
];

// Plain links throughout: these pages are also served as static HTML with no app script.
export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[rgb(18_18_18/0.72)] backdrop-blur-[14px]">
      <div className="mx-auto flex h-[68px] max-w-[1200px] items-center gap-2.5 pr-4 pl-5">
        <a href="/" aria-label="linkables home" className="flex min-h-11 items-center rounded-md">
          <MarkWordmark textClass="text-[18px] max-[400px]:sr-only" />
        </a>
        <BetaPill className="hidden sm:flex" />
        <nav aria-label="Main" className="ml-[18px] hidden gap-1 text-[15px] min-[860px]:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="flex h-10 items-center rounded-[10px] px-3 text-muted-foreground hover:bg-muted hover:text-foreground">
              {item.label}
            </a>
          ))}
        </nav>
        <span className="flex-1" />
        <a href="/sign-in" className={buttonVariants({ variant: "ghost", className: "hidden h-[42px] px-4 text-[15px] min-[860px]:inline-flex" })}>
          Sign in
        </a>
        <a href={CTA.href} className={buttonVariants({ className: "h-[42px] px-[18px] text-[15px]" })}>
          {CTA.label}
        </a>
        <PhoneMenu />
      </div>
    </header>
  );
}

// A native disclosure, so the menu opens without any script.
function PhoneMenu() {
  return (
    <details className="lp-menu min-[860px]:hidden" data-lp-menu="">
      <summary aria-label="Menu" className="flex size-11 cursor-pointer items-center justify-center rounded-xl bg-muted">
        <Menu aria-hidden className="size-[18px]" />
      </summary>
      <nav aria-label="Menu" className="absolute inset-x-0 top-full flex flex-col gap-1 border-y border-border bg-background px-5 pt-1.5 pb-[18px]">
        {NAV.map((item) => (
          <a key={item.href} href={item.href} className="flex h-12 items-center text-[17px] text-foreground">
            {item.label}
          </a>
        ))}
        <a href="/sign-in" className={buttonVariants({ variant: "ghost", className: "mt-1.5 h-12 text-base" })}>
          Sign in
        </a>
      </nav>
    </details>
  );
}
