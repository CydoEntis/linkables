import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { signOut, supabase } from "../auth/supabase";
import { GHOST_BUTTON } from "../ui";
import { OPEN_SIDE_PANEL_COMMAND } from "./open-side-panel";
import { appUrl } from "./queries";
import { shortcutLabel } from "./shortcut";

// Read each time the view opens: people change keys at chrome://extensions/shortcuts.
function useShortcut() {
  return useQuery({
    queryKey: ["panel", "shortcut"],
    queryFn: async () => shortcutLabel(await chrome.commands.getAll(), OPEN_SIDE_PANEL_COMMAND),
    staleTime: 0,
  }).data;
}

function useAccountEmail() {
  return useQuery({
    queryKey: ["panel", "account"],
    queryFn: async () => (await supabase.auth.getSession()).data.session?.user.email ?? null,
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
      <Group title="Shortcuts">
        <Row label="Open side panel">
          <kbd className="rounded-md bg-accent px-2 py-1 font-mono text-[12px]">{shortcut ?? "…"}</kbd>
        </Row>
        <button
          type="button"
          onClick={() => void chrome.tabs.create({ url: "chrome://extensions/shortcuts" })}
          className="self-start rounded-md px-1 text-[12.5px] text-muted-foreground hover:text-foreground"
        >
          Change shortcuts
        </button>
      </Group>
      <Group title="Account">
        <Row label={<span className="break-all">{email ?? "…"}</span>}>
          <button type="button" onClick={() => void signOut()} className={GHOST_BUTTON}>
            Sign out
          </button>
        </Row>
      </Group>
      <a href={appUrl("/settings")} target="_blank" rel="noreferrer" className="self-start rounded-md px-1 text-[13px] font-semibold hover:text-primary">
        All settings in linkables ↗
      </a>
    </main>
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
