import type { ReactNode } from "react";
import { AppShell } from "../shell/AppShell";
import { LinkList } from "./LinkList";
import { SaveBar } from "./SaveBar";
import { SaveFab, SaveSheet } from "./SaveSheet";
import { SaveStatus } from "./SaveStatus";
import type { ListScope } from "./use-links";
import { usePasteToSave } from "./use-paste-to-save";

// One list screen for the views and for a collection; only the heading differs.
export function LinksScreen({ scope, heading }: { scope: ListScope; heading: ReactNode }) {
  usePasteToSave();

  return (
    <AppShell scope={scope}>
      <SaveBar className="hidden md:block" />
      {heading}
      <LinkList scope={scope} />
      <SaveStatus />
      <SaveFab />
      <SaveSheet />
    </AppShell>
  );
}
