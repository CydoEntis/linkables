import { getRouteApi } from "@tanstack/react-router";
import { AppShell } from "../shell/AppShell";
import { LinkList } from "./LinkList";
import { VIEW_LABELS } from "./links-search";
import { SaveBar } from "./SaveBar";
import { SaveFab, SaveSheet } from "./SaveSheet";
import { SaveStatus } from "./SaveStatus";
import { usePasteToSave } from "./use-paste-to-save";

const route = getRouteApi("/");

export function LinksPage() {
  const { view } = route.useSearch();
  usePasteToSave();

  return (
    <AppShell view={view}>
      <SaveBar className="hidden md:block" />
      <h1 className="sr-only text-[34px] leading-[1.1] font-bold tracking-[-0.03em] md:not-sr-only md:mt-[30px] md:mb-3.5 md:block">
        {VIEW_LABELS[view]}
      </h1>
      <LinkList view={view} />
      <SaveStatus />
      <SaveFab />
      <SaveSheet />
    </AppShell>
  );
}
