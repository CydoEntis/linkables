import { isApiError } from "@linkables/shared/api-client";
import { ERROR_CODES } from "@linkables/shared/http";
import type { SharedCollection, SharedLink } from "@linkables/shared/sharing";
import { getRouteApi } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { displayName } from "../collections/display-name";
import { linkCountLabel } from "../collections/ShareDialog";
import { domainOf, safeHref, urlWithoutScheme } from "../links/link-display";
import { MarkWordmark } from "../marketing/Mark";
import { openAll } from "./open-all";
import { SharedThumb } from "./SharedThumb";
import { useSharedCollection } from "./use-share";

const route = getRouteApi("/s/$token");

export function SharedCollectionPage() {
  const { token } = route.useParams();
  const shared = useSharedCollection(token);
  useNoIndex();

  let body: ReactNode;
  if (shared.isPending) body = <p className="py-14 text-sm text-muted-foreground">Loading…</p>;
  else if (shared.isSuccess) body = <Collection collection={shared.data} />;
  else if (isApiError(shared.error, ERROR_CODES.NOT_FOUND)) body = <Unavailable />;
  else body = <LoadFailed onRetry={() => void shared.refetch()} />;

  return (
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto w-full max-w-[880px] px-4 pt-5 md:px-6 md:pt-8">
        <a href="/" aria-label="linkables home" className="inline-flex min-h-11 items-center">
          <MarkWordmark size={22} textClass="text-[16px]" />
        </a>
      </header>
      <main className="mx-auto w-full max-w-[880px] flex-1 px-4 pb-12 md:px-6">{body}</main>
      <footer className="mx-auto w-full max-w-[880px] border-t border-border px-4 py-6 text-sm text-muted-foreground md:px-6">
        <a href="/" className="inline-flex min-h-11 items-center hover:text-foreground">
          Made with linkables
        </a>
      </footer>
    </div>
  );
}

// The app shell is already noindex; a shared collection also asks crawlers not to follow its links.
function useNoIndex() {
  useEffect(() => {
    const robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (robots === null) return;
    const previous = robots.content;
    robots.content = "noindex, nofollow";
    return () => { robots.content = previous; };
  }, []);
}

function Collection({ collection }: { collection: SharedCollection }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${displayName(collection.name)} · linkables`;
    return () => { document.title = previous; };
  }, [collection.name]);

  return (
    <>
      <div className="mt-8 mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 md:mt-12">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-[26px] leading-[1.15] font-semibold tracking-[-0.03em] wrap-anywhere md:text-[34px]">
            {displayName(collection.name)}
          </h1>
          <p className="text-[14px] text-muted-foreground">
            {linkCountLabel(collection.linkCount)}
            {collection.links.length < collection.linkCount ? ` · showing the newest ${String(collection.links.length)}` : null}
          </p>
        </div>
        {collection.links.length > 0 ? <OpenAll links={collection.links} /> : null}
      </div>
      {collection.links.length > 0 ? (
        <ul className="-mx-2 flex flex-col gap-1 md:-mx-3.5">
          {collection.links.map((link, index) => (
            <SharedRow key={`${String(index)}-${link.url}`} link={link} />
          ))}
        </ul>
      ) : (
        <p className="py-10 text-[15px] text-muted-foreground">Nothing in this collection yet.</p>
      )}
    </>
  );
}

function OpenAll({ links }: { links: SharedLink[] }) {
  const [blocked, setBlocked] = useState(0);

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <Button
        size="touch"
        onClick={() => { setBlocked(openAll(links.map((link) => link.url)).blocked); }}
      >
        <ExternalLink aria-hidden />
        Open all
      </Button>
      <p role="status" className="max-w-[340px] text-[13px] text-muted-foreground md:text-right">
        {blocked > 0
          ? `Your browser blocked ${linkCountLabel(blocked)}. Allow pop-ups for linkables.app, then press Open all again.`
          : null}
      </p>
    </div>
  );
}

function SharedRow({ link }: { link: SharedLink }) {
  const href = safeHref(link.url);
  const title = link.title ?? urlWithoutScheme(link.url);
  const content = (
    <>
      <SharedThumb link={link} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-[15px] leading-snug font-semibold wrap-anywhere md:text-[15.5px]">{title}</span>
        <span className="truncate text-[13px] text-muted-foreground">{domainOf(link.url)}</span>
        {link.description ? (
          <span className="line-clamp-2 text-[13.5px] leading-snug text-soft-foreground">{link.description}</span>
        ) : null}
      </span>
    </>
  );
  const row = "flex items-start gap-3 rounded-xl px-2 py-2.5 md:gap-4 md:px-3.5";

  return (
    <li>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={`${row} transition-colors hover:bg-row-hover`}>
          {content}
        </a>
      ) : (
        <div className={row}>{content}</div>
      )}
    </li>
  );
}

function Unavailable() {
  return (
    <div className="flex flex-col items-start gap-3 py-14">
      <h1 className="font-display text-[24px] leading-[1.15] font-semibold tracking-[-0.03em] md:text-[30px]">
        This shared collection isn't available
      </h1>
      <p className="text-[15px] text-muted-foreground">The link may have been turned off, or the address has a typo.</p>
      <a href="/" className={buttonVariants({ size: "touch", className: "mt-2" })}>
        Go to linkables
      </a>
    </div>
  );
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 py-14">
      <h1 className="text-[20px] font-bold">Couldn't load this collection</h1>
      <p className="text-[15px] text-muted-foreground">Check your connection, or try again in a moment.</p>
      <Button variant="ghost" size="touch" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
