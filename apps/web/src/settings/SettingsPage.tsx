import { AppShell } from "../shell/AppShell";
import { AccountSection } from "./AccountSection";
import { DataSection } from "./DataSection";
import { EverywhereSection } from "./EverywhereSection";
import { HelpSection } from "./HelpSection";
import { SharedCollectionsSection } from "./SharedCollectionsSection";

export function SettingsPage() {
  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-2 md:px-0">
        <h1 className="text-[28px] leading-[1.1] font-bold tracking-[-0.03em] md:text-[34px]">Settings</h1>
        <AccountSection />
        <EverywhereSection />
        <SharedCollectionsSection />
        <DataSection />
        <HelpSection />
      </div>
    </AppShell>
  );
}
