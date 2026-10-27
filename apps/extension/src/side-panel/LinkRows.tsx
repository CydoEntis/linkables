import type { SavedLink } from "@linkables/shared/links";
import { Pin } from "lucide-react";
import type { ReactNode } from "react";
import { linkMeta, linkTitle, type LinkTab } from "./link-list";
import { appUrl, usePanelLinks } from "./queries";
import { LinkThumb } from "./Thumb";

// The API saves only http(s) addresses; this keeps any other scheme from becoming a link.
function safeHref(url: string): string | undefined {
  if (!URL.canParse(url)) return undefined;
  const { protocol } = new URL(url);
  return protocol === "http:" || protocol === "https:" ? url : undefined;
}

export function LinkRows({ tab, query }: { tab: LinkTab; query: string }) {
  const links = usePanelLinks(tab, query);
  if (links.isPending) return <RowsSkeleton />;
  if (links.isError) return <ListProblem onRetry={() => void links.refetch()}>Couldn't load your links.</ListProblem>;
  const { items, more } = links.data;
  if (items.length === 0) return <Empty>{query ? `No links match “${query}”.` : tab === "pinned" ? "Nothing pinned yet." : "No links yet. Save this page to start."}</Empty>;
  const now = Date.now();

  return (
    <>
      <ul aria-label={tab === "pinned" ? "Pinned links" : "Recent links"} className="-mx-1.5 flex flex-col">
        {items.map((link) => (
          <li key={link.id}>
            <LinkRow link={link} now={now} />
          </li>
        ))}
      </ul>
      {more ? (
        <a href={appUrl("/")} target="_blank" rel="noreferrer" className="self-center rounded-md px-2 py-2 text-[12.5px] text-muted-foreground hover:text-foreground">
          See all in linkables ↗
        </a>
      ) : null}
    </>
  );
}

export function LinkRow({ link, now }: { link: SavedLink; now: number }) {
  return (
    <a
      href={safeHref(link.originalUrl)}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2.5 rounded-xl px-1.5 py-1.5 hover:bg-muted"
    >
      <LinkThumb link={link} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[13px] font-semibold">{linkTitle(link)}</span>
        <span className="truncate text-[11.5px] text-muted-foreground">{linkMeta(link, now)}</span>
      </span>
      {link.pinned ? <Pin aria-label="Pinned" className="size-3.5 shrink-0 text-muted-foreground" /> : null}
    </a>
  );
}

export function RowsSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-2 py-1">
      {[0, 1, 2].map((row) => (
        <span key={row} className="h-10 animate-pulse rounded-xl bg-muted" />
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-1 py-6 text-center text-[12.5px] text-muted-foreground">{children}</p>;
}

export function ListProblem({ children, onRetry }: { children: ReactNode; onRetry: () => void }) {
  return (
    <p role="alert" className="flex items-center justify-between gap-2 px-1 py-3 text-[12.5px] text-muted-foreground">
      {children}
      <button type="button" onClick={onRetry} className="min-h-8 rounded-md px-2 font-semibold text-foreground hover:bg-muted">
        Try again
      </button>
    </p>
  );
}
