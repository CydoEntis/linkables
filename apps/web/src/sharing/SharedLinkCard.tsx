import type { SharedLink } from "@linkables/shared/sharing";
import { cn } from "cn";
import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import { domainOf, safeHref, tileFor, urlWithoutScheme } from "../links/link-display";
import { SharedThumb } from "./SharedThumb";

type SharedLinkProps = { link: SharedLink; opened: boolean; onOpen: () => void };

export function SharedLinkCard({ link, opened, onOpen }: SharedLinkProps) {
  return (
    <LinkFrame
      link={link}
      onOpen={onOpen}
      className="flex h-full animate-fade-up flex-col overflow-hidden rounded-2xl bg-card shadow-[0_0_0_1px_var(--border)] transition-[translate,box-shadow] duration-200 ease-out hover:shadow-[0_0_0_1px_var(--line-strong),0_24px_40px_-24px_rgb(0_0_0/0.9)] motion-safe:hover:-translate-y-[3px]"
    >
      <span className="relative block">
        <SharedThumb link={link} className="aspect-[16/10] w-full" />
        {opened ? <OpenedTag className="absolute top-3 right-3 animate-pop" /> : null}
      </span>
      <span className="flex flex-col gap-2 px-[18px] pt-4 pb-5">
        <SiteRow link={link} />
        <span className="text-[17px] leading-[1.3] font-bold tracking-[-0.005em] wrap-anywhere">{titleOf(link)}</span>
        {link.description ? <span className="line-clamp-3 text-[14px] leading-normal text-[#b3b2ad]">{link.description}</span> : null}
      </span>
    </LinkFrame>
  );
}

export function SharedLinkRow({ link, opened, onOpen }: SharedLinkProps) {
  return (
    <LinkFrame link={link} onOpen={onOpen} className="flex items-center gap-5 rounded-2xl p-3 transition-colors hover:bg-row-hover">
      <SharedThumb link={link} className="h-[104px] w-[168px] rounded-xl" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-[17px] font-bold wrap-anywhere">{titleOf(link)}</span>
        <span className="text-[12.5px] text-muted-foreground">{domainOf(link.url)}</span>
        {link.description ? <span className="line-clamp-2 text-[14px] leading-normal text-[#b3b2ad]">{link.description}</span> : null}
      </span>
      {opened ? <OpenedTag /> : null}
    </LinkFrame>
  );
}

function titleOf(link: SharedLink): string {
  return link.title ?? urlWithoutScheme(link.url);
}

// A link that isn't http(s) is shown but can't be opened from here.
function LinkFrame({ link, onOpen, className, children }: { link: SharedLink; onOpen: () => void; className: string; children: ReactNode }) {
  const href = safeHref(link.url);
  if (href === undefined) return <div className={className}>{children}</div>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onOpen} className={className}>
      {children}
    </a>
  );
}

function SiteRow({ link }: { link: SharedLink }) {
  const [iconFailed, setIconFailed] = useState(false);
  const domain = domainOf(link.url);
  return (
    <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-muted-foreground">
      <span aria-hidden className="flex size-[18px] shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-accent text-[10px] font-bold text-foreground">
        {link.faviconUrl && !iconFailed ? (
          <img
            src={link.faviconUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => { setIconFailed(true); }}
            className="size-3.5"
          />
        ) : (
          tileFor(domain).letter
        )}
      </span>
      <span className="truncate">{domain}</span>
    </span>
  );
}

function OpenedTag({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-7 shrink-0 items-center gap-[5px] rounded-full bg-primary px-[11px] text-[12.5px] font-bold text-primary-foreground", className)}>
      <Check aria-hidden strokeWidth={2.8} className="size-3" />
      Opened
    </span>
  );
}
