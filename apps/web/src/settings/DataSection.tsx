import { Check, Download, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useExportLinks } from "../export/use-export-links";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { SETTINGS_ACTION, SettingsRow, SettingsSection } from "./SettingsSection";

const ICON_TILE = "flex size-9 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-[17px]";

export function DataSection() {
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <SettingsSection title="Your data">
      <SettingsRow
        label="Export my links"
        detail="A JSON file with every link, note and collection."
        leading={
          <span aria-hidden className={`${ICON_TILE} bg-muted`}>
            <Download />
          </span>
        }
      >
        <ExportButton />
      </SettingsRow>
      <SettingsRow
        label="Delete account"
        detail="Deletes everything right away. This can't be undone."
        leading={
          <span aria-hidden className={`${ICON_TILE} bg-destructive/12 text-destructive`}>
            <Trash2 />
          </span>
        }
      >
        <Button variant="ghost" className={`${SETTINGS_ACTION} text-destructive`} onClick={() => { setDeleteOpen(true); }}>
          Delete account…
        </Button>
      </SettingsRow>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </SettingsSection>
  );
}

type ExportState = "idle" | "preparing" | "done";

const DONE_SHOWN_MS = 3000;

function ExportButton() {
  const exportLinks = useExportLinks();
  const [state, setState] = useState<ExportState>("idle");

  useEffect(() => {
    if (state !== "done") return;
    const timer = setTimeout(() => { setState("idle"); }, DONE_SHOWN_MS);
    return () => { clearTimeout(timer); };
  }, [state]);

  async function run() {
    setState("preparing");
    setState((await exportLinks()) ? "done" : "idle");
  }

  return (
    <Button variant="ghost" className={`${SETTINGS_ACTION} min-w-[116px] disabled:opacity-100`} disabled={state === "preparing"} onClick={() => void run()}>
      {state === "preparing" ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
      {state === "done" ? <Check aria-hidden /> : null}
      {state === "idle" ? <Download aria-hidden /> : null}
      <span aria-live="polite">{EXPORT_LABELS[state]}</span>
    </Button>
  );
}

const EXPORT_LABELS: Record<ExportState, string> = { idle: "Export", preparing: "Preparing…", done: "Downloaded" };
