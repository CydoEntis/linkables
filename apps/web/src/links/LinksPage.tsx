import { getRouteApi } from "@tanstack/react-router";
import { AppShell } from "../shell/AppShell";
import { LinkList } from "./LinkList";
import { VIEW_LABELS } from "./links-search";

const route = getRouteApi("/");

export function LinksPage() {
  const { view } = route.useSearch();

  return (
    <AppShell view={view}>
      <h1 className="sr-only text-[34px] leading-[1.1] font-bold tracking-[-0.03em] md:not-sr-only md:mt-[30px] md:mb-3.5 md:block">
        {VIEW_LABELS[view]}
      </h1>
      <LinkList view={view} />
    </AppShell>
  );
}
