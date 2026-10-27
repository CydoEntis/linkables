import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { cn } from "cn";
import { useId, type ReactNode } from "react";
import { signOut, readConnection, disconnectServer } from "../auth/session";
import { GHOST_BUTTON } from "../ui";
import { appUrl } from "./queries";
import { useFollowTabs } from "./use-follow-tabs";
import { useShortcut } from "./use-shortcut";

function useAccountEmail() {
  return useQuery({
    queryKey: ["panel", "account"],
    queryFn: async () => (await readConnection())?.session?.user.email ?? null,
  }).data;
}

export function ExtensionSettings({ onBack }: { onBack: () => void }) {
  const shortcut = useShortcut();
  const email = useAccountEmail();

  return (
    <main className="flex animate-rise flex-col gap-4 p-4">
      <header className="flex items-center gap-2">
        <button type="button" aria-label="Back" onClick={onBack} className="flex size-8 items-center justify-center rounded-full hover:bg-muted">
          <ArrowLeft aria-hidden className="size-4" />
        </button>
        <h1 className="text-[16px] font-bold">Extension settings</h1>
      </header>
      <FollowTabsSetting />
      <Group title="Shortcuts">
        <Row label="Open side panel">
          <kbd className="rounded-md bg-accent px-2 py-1 font-mono text-[12px]">{shortcut ?? "â€¦"}</kbd>
        </Row>
        {chrome.sidebarAction ? (
          // Firefox's pages cannot open about:addons, so point at it.
          <p className="text-[12.5px] text-muted-foreground">Change it in Add-ons Manager: the gear, then Manage Extension Shortcuts.</p>
        ) : (
          <button
            type="button"
            onClick={() => void chrome.tabs.create({ url: "chrome://extensions/shortcuts" })}
            className="self-start rounded-md px-1 text-[12.5px] text-muted-foreground hover:text-foreground"
          >
            Change shortcuts
          </button>
        )}
      </Group>
      <Group title="Account">
        <Row label={<span className="break-all">{email ?? "â€¦"}</span>}>
          <button type="button" onClick={() => void signOut()} className={GHOST_BUTTON}>
            Sign out
          </button>
        </Row>
        <button type="button" onClick={() => void disconnectServer()} className={GHOST_BUTTON}>Change server</button>
      </Group>
      <a href={appUrl("/settings")} target="_blank" rel="noreferrer" className="self-start rounded-md px-1 text-[13px] font-semibold hover:text-primary">
        All settings in linkables â†—
      </a>
    </main>
  );
}

function FollowTabsSetting() {
  const follow = useFollowTabs();
  const descriptionId = useId();
  return (
    <Group title="Side panel">
      <Row label="Follow the tab you're on">
        <button
          type="button"
          role="switch"
          aria-label="Follow the tab you're on"
          aria-checked={follow.on === true}
          aria-describedby={descriptionId}
          disabled={follow.on === undefined}
          onClick={follow.on ? follow.turnOff : follow.turnOn}
          className={cn("flex h-6 w-10 shrink-0 items-center rounded-full p-0.5", follow.on ? "bg-primary" : "bg-line-strong")}
        >
          <span aria-hidden className={cn("size-5 rounded-full bg-foreground transition-transform", follow.on && "translate-x-4 bg-primary-foreground")} />
        </button>
      </Row>
      <p id={descriptionId} className="text-[12px] leading-snug text-muted-foreground">
        The panel shows each tab you switch to. Chrome asks you to let linkables read your tabs' addresses and titles.
      </p>
    </Group>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl bg-muted p-3.5">
      <h2 className="text-[12px] font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13.5px]">
      <span className="min-w-0">{label}</span>
      {children}
    </div>
  );
}

