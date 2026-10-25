import type { SharedCollection as SharedCollectionData, SharedLink } from "@linkables/shared/sharing";
import { cn } from "cn";
import { ExternalLink, Globe, LayoutGrid, List } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { displayName } from "../collections/display-name";
import { BlockedBanner } from "./BlockedBanner";
import { openAll, type OpenAllResult } from "./open-all";
import { sharedMeta } from "./shared-meta";
import { SharedLinkCard, SharedLinkRow } from "./SharedLinkCard";

type View = "grid" | "list";

function useDocumentTitle(name: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${displayName(name)} · linkables`;
    return () => { document.title = previous; };
  }, [name]);
}

// Tracks which links this visit opened, and which ones the last Open all couldn't.
function useOpening() {
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [attempt, setAttempt] = useState<OpenAllResult | null>(null);

  const markOpened = (urls: readonly string[]) => { setOpened((current) => new Set([...current, ...urls])); };
  const open = (urls: readonly string[]) => {
    const result = openAll(urls);
    markOpened(result.opened);
    setAttempt(result);
  };
  const stillBlocked = attempt?.blocked.filter((url) => !opened.has(url)) ?? [];
  return { opened, openedByOpenAll: attempt?.opened.length ?? 0, stillBlocked, open, markOpened };
}

export function SharedCollection({ collection, wide }: { collection: SharedCollectionData; wide: boolean }) {
  useDocumentTitle(collection.name);
  const [view, setView] = useState<View>("grid");
  const opening = useOpening();
  const { links } = collection;
  const showList = wide && view === "list";
  const blocked = opening.stillBlocked.length > 0;

  return (
    <>
      <div className="flex animate-fade-up flex-wrap items-end justify-between gap-x-8 gap-y-5 pt-[18px] pb-[22px] md:pt-11 md:pb-8">
        <div className="flex min-w-0 flex-col gap-3.5">
          <span className="inline-flex h-7 items-center gap-[7px] self-start rounded-full bg-muted px-[11px] text-[12.5px] font-semibold text-muted-foreground">
            <Globe aria-hidden className="size-[13px]" />
            Shared collection
          </span>
          <h1 className="text-[40px] leading-[1.02] font-bold tracking-[-0.035em] wrap-anywhere md:text-[64px]">{displayName(collection.name)}</h1>
          <p className="text-[15px] text-muted-foreground">{sharedMeta(collection, Date.now())}</p>
        </div>
        {links.length > 0 ? (
          <div className="flex w-full items-center gap-2.5 md:w-auto">
            {wide ? <ViewToggle view={view} onChange={setView} /> : null}
            <Button
              variant={blocked ? "ghost" : "default"}
              onClick={() => { opening.open(links.map((link) => link.url)); }}
              className="h-12 w-full px-5 text-[15px] font-bold md:w-auto"
            >
              <ExternalLink aria-hidden />
              Open all {links.length}
            </Button>
          </div>
        ) : null}
      </div>
      {blocked ? (
        <BlockedBanner
          wide={wide}
          opened={opening.openedByOpenAll}
          blocked={opening.stillBlocked.length}
          total={links.length}
          onOpenRest={() => { opening.open(opening.stillBlocked); }}
        />
      ) : null}
      {links.length === 0 ? <p className="py-10 text-[15px] text-muted-foreground">Nothing in this collection yet.</p> : null}
      <ul className={cn(showList ? "flex flex-col gap-1.5" : "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3")}>
        {links.map((link, index) => (
          <li key={`${String(index)}-${link.url}`}>
            <LinkItem link={link} list={showList} opened={opening.opened.has(link.url)} onOpen={() => { opening.markOpened([link.url]); }} />
          </li>
        ))}
      </ul>
    </>
  );
}

function LinkItem({ link, list, opened, onOpen }: { link: SharedLink; list: boolean; opened: boolean; onOpen: () => void }) {
  return list ? <SharedLinkRow link={link} opened={opened} onOpen={onOpen} /> : <SharedLinkCard link={link} opened={opened} onOpen={onOpen} />;
}

const VIEWS = [
  { id: "grid", label: "Grid", Icon: LayoutGrid },
  { id: "list", label: "List", Icon: List },
] as const;

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  return (
    <div role="group" aria-label="Layout" className="flex gap-0.5 rounded-[11px] bg-muted p-[3px]">
      {VIEWS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={view === id}
          onClick={() => { onChange(id); }}
          className={cn(
            "flex h-[30px] items-center gap-1.5 rounded-lg px-[11px] text-[13px] font-semibold transition-colors",
            view === id ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon aria-hidden className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
