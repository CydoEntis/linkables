import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "cn";
import { CollectionChip } from "../collections/CollectionSheet";
import { SidebarCollections } from "../collections/SidebarCollections";
import { ExtensionCard } from "../extension-guide/ExtensionCard";
import { LINKS_VIEWS, VIEW_LABELS, type LinksView } from "../links/links-search";
import type { ListScope } from "../links/use-links";
import { AccountMenu } from "./AccountMenu";
import { Wordmark } from "./Wordmark";

// search: the phone's search field, above the view chips as in the handoff.
type AppShellProps = { scope: ListScope; search?: ReactNode; children: ReactNode };

// The phone's first chip picks All links or a collection, so only these two are plain links there.
const PHONE_VIEW_CHIPS: LinksView[] = ["pinned", "inbox"];

// shortcut: the sidebar shows no counts yet; the API has no count endpoint, and
// counting loaded pages would be wrong past the first page.
export function AppShell({ scope, search, children }: AppShellProps) {
  const view = "view" in scope ? scope.view : undefined;
  const collectionId = "collectionId" in scope ? scope.collectionId : undefined;

  return (
    <div className="min-h-svh md:grid md:grid-cols-[272px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col gap-6 border-r border-border bg-sidebar px-4 pt-6 pb-4 md:flex">
        <Link to="/" className="self-start rounded-md px-2.5 py-1" aria-label="linkables, All links">
          <Wordmark />
        </Link>
        <nav aria-label="Links" className="flex flex-col gap-0.5 text-[14.5px]">
          {LINKS_VIEWS.map((item) => (
            <Link
              key={item}
              to="/"
              search={{ view: item }}
              aria-current={item === view ? "page" : undefined}
              className={cn(
                "flex h-[38px] items-center rounded-md px-3 font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                item === view && "bg-muted font-semibold text-foreground",
              )}
            >
              {VIEW_LABELS[item]}
            </Link>
          ))}
        </nav>
        <SidebarCollections activeId={collectionId} />
        <ExtensionCard />
        <div>
          <AccountMenu showEmail />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-[50px] items-center justify-between px-[18px] pt-1 md:hidden">
          <Link to="/" className="flex min-h-11 items-center rounded-md" aria-label="linkables, All links">
            <Wordmark />
          </Link>
          <AccountMenu />
        </header>
        {search ? <div className="px-4 pt-1.5 pb-1 md:hidden">{search}</div> : null}
        <nav aria-label="Links" className="flex gap-2 overflow-x-auto px-4 md:hidden">
          <CollectionChip activeId={collectionId} allActive={view === "all"} />
          {PHONE_VIEW_CHIPS.map((item) => (
            <Link
              key={item}
              to="/"
              search={{ view: item }}
              aria-current={item === view ? "page" : undefined}
              className="group flex h-11 shrink-0 items-center rounded-full"
            >
              <span
                className={cn(
                  "flex h-[38px] items-center rounded-full px-3.5 text-sm",
                  item === view ? "bg-foreground font-semibold text-background" : "bg-muted text-soft-foreground",
                )}
              >
                {VIEW_LABELS[item]}
              </span>
            </Link>
          ))}
        </nav>
        <main className="mx-auto w-full max-w-[1040px] px-2 pt-3 pb-32 md:px-14 md:pt-8">{children}</main>
      </div>
    </div>
  );
}
