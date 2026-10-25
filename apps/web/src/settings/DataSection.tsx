import { Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useExportLinks } from "../export/use-export-links";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { SettingsRow, SettingsSection } from "./SettingsSection";

export function DataSection() {
  const exportLinks = useExportLinks();
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <SettingsSection title="Your data">
      <SettingsRow label="Download a copy" detail="One JSON file with every link, note and collection.">
        <Button variant="ghost" size="touch" onClick={() => void exportLinks()}>
          <Download aria-hidden />
          Export my links
        </Button>
      </SettingsRow>
      <SettingsRow label="Delete your account" detail="Deletes your links, notes and collections for good.">
        <Button variant="destructive" size="touch" onClick={() => { setDeleteOpen(true); }}>
          <Trash2 aria-hidden />
          Delete account
        </Button>
      </SettingsRow>
      <DeleteAccountDialog open={deleteOpen} onOpenChange={setDeleteOpen} />
    </SettingsSection>
  );
}
