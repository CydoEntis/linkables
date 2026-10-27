import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SUPPORT_EMAIL } from "../config/access";
import { AppShell } from "../shell/AppShell";
import { AccountSection } from "./AccountSection";
import { AppearanceSection } from "./AppearanceSection";
import { DataSection } from "./DataSection";
import { EverywhereSection } from "./EverywhereSection";
import { HelpSection } from "./HelpSection";
import { OpeningLinksSection } from "./OpeningLinksSection";
import { SharedCollectionsSection } from "./SharedCollectionsSection";

export function SettingsPage() {
  return (
    <AppShell phoneChrome={false}>
      <div className="mx-auto flex w-full max-w-[684px] animate-rise flex-col gap-[26px] px-2.5 pb-12 md:gap-[30px] md:px-0 md:pt-3">
        <Link
          to="/"
          className="-ml-1 flex h-11 items-center gap-1.5 self-start rounded-md text-[15px] font-semibold text-muted-foreground hover:text-foreground md:hidden"
        >
          <ArrowLeft aria-hidden className="size-[18px]" />
          Back
        </Link>
        <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.025em] md:text-[34px]">Settings</h1>
        <AccountSection />
        <EverywhereSection />
        <SharedCollectionsSection />
        <OpeningLinksSection />
        <AppearanceSection />
        <DataSection />
        <HelpSection />
        <p className="text-center text-[12px] text-subtle-foreground">linkables beta · {SUPPORT_EMAIL}</p>
      </div>
    </AppShell>
  );
}
