import { canRead, type SavedLink } from "@linkables/shared/links";
import { cn } from "cn";
import { Ban, BookOpen, Check, ExternalLink, Link2, LoaderCircle, Pin } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { markSaved } from "../badge/saved-badge";
import { CollectionPicker } from "../collections/CollectionPicker";
import { FiledGroups } from "../collections/FiledGroups";
import { locationLabel } from "../collections/picker";
import { useFiling } from "../collections/use-collections";
import { useCopy, type CopyState } from "../copy/use-copy";
import { CANT_SAVE_REASONS, savablePage } from "../save/savable";
import { SAVE_MESSAGES, savedTitle } from "../save/save-flow";
import { usePin, type LinkUpdate } from "../save/use-pin";
import { Alert, PRIMARY_BUTTON, TILE } from "../ui";
import { appUrl, usePageLink, useSavePage, useUpdatePageLink } from "./queries";
import { LinkThumb } from "./Thumb";
import { useCurrentTab } from "./use-current-tab";
import { useFollowTabs } from "./use-follow-tabs";
import { useShortcut } from "./use-shortcut";

const CARD = "flex flex-col gap-3 rounded-2xl bg-muted p-3.5";

export function ThisPage() {
  const tab = useCurrentTab();
  const follow = useFollowTabs();
  if (tab === undefined || follow.on === undefined) return <CardSkeleton />;
  const page = savablePage(tab);
  // The panel stays open across tabs; without the tabs permission it can't read most of them.
  if (!page.ok && page.reason === CANT_SAVE_REASONS.unreadable && !follow.on) return <CantSeeTab onFollow={follow.turnOn} />;
  if (!page.ok) return <CantSave reason={page.reason} />;
  return <PageCard key={page.url} tabId={tab.id} url={page.url} title={page.title} />;
}

function CantSeeTab({ onFollow }: { onFollow: () => void }) {
  const shortcut = useShortcut();
  return (
    <Section>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[14px] font-bold">linkables can't see this tab yet</h2>
        <p className="text-[12.5px] leading-snug text-muted-foreground">Chrome shows linkables a tab only after you use linkables on it.</p>
      </div>
      <button type="button" onClick={onFollow} className={PRIMARY_BUTTON}>
        Follow the tab you're on
      </button>
      {shortcut && shortcut !== "Not set" ? (
        <p className="text-[12.5px] leading-snug text-muted-foreground">
          Or press <kbd className="rounded-md bg-accent px-1.5 py-0.5 font-mono text-[11.5px] text-foreground">{shortcut}</kbd> to use linkables on just this page.
        </p>
      ) : null}
    </Section>
  );
}

// Keeps the toolbar's ✓ in step with what the panel found for the tab.
function useBadge(tabId: number | undefined, saved: boolean, known: boolean) {
  useEffect(() => {
    if (tabId !== undefined && known) void markSaved(tabId, saved);
  }, [tabId, saved, known]);
}

function Section({ children }: { children: ReactNode }) {
  return (
    <section aria-label="This page" className={CARD}>
      {children}
    </section>
  );
}

function CardSkeleton() {
  return (
    <Section>
      <div aria-busy className="h-[60px] animate-pulse rounded-xl bg-accent" />
    </Section>
  );
}

function CantSave({ reason }: { reason: string }) {
  return (
    <Section>
      <div className="flex items-start gap-3">
        <span className="flex size-9 flex-none items-center justify-center rounded-full bg-accent text-muted-foreground">
          <Ban aria-hidden className="size-4" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[14px] font-bold">This page can't be saved</h2>
          <p className="text-[12.5px] leading-snug text-muted-foreground">{reason}</p>
        </div>
      </div>
    </Section>
  );
}

type PageCardProps = { tabId: number | undefined; url: string; title: string | null };

function PageCard({ tabId, url, title }: PageCardProps) {
  const lookup = usePageLink(url);
  const save = useSavePage(url, title);
  const outcome = save.data;
  const updatePage = useUpdatePageLink(url);
  const found = lookup.data?.status === "saved" ? lookup.data.link : null;
  const link = found ?? (outcome?.status === "saved" ? outcome.link : null);
  // Only a finished lookup that found nothing may clear the ✓.
  useBadge(tabId, link !== null, link !== null || lookup.data?.status === "not-saved");
  if (lookup.isPending) return <CardSkeleton />;
  if (link) return <SavedPage key={link.id} link={link} pageTitle={title} onSaved={updatePage} />;
  const problem = save.isError ? SAVE_MESSAGES.failed : outcome?.status === "error" ? outcome.message : outcome?.status === "cant" ? outcome.reason : null;

  return (
    <Section>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h2 className="text-[12px] font-semibold text-muted-foreground">This page</h2>
        <p className="truncate text-[14px] font-bold">{title ?? url}</p>
      </div>
      <button type="button" disabled={save.isPending} onClick={() => { save.mutate(); }} className={PRIMARY_BUTTON}>
        {save.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
        {save.isPending ? "Saving…" : "Save this page"}
      </button>
      {problem ? <Alert>{problem}</Alert> : null}
    </Section>
  );
}

const SHARE_LABELS: Record<CopyState, string> = { idle: "Share", copied: "Copied ✓", failed: "Couldn't copy" };

type SavedPageProps = { link: SavedLink; pageTitle: string | null; onSaved: LinkUpdate };

function SavedPage({ link, pageTitle, onSaved }: SavedPageProps) {
  const filing = useFiling(link.id, link.collections, onSaved);
  const pin = usePin(link.id, link.pinned, onSaved);
  const share = useCopy();
  const problem = pin.problem ?? filing.problem;

  return (
    <Section>
      <div className="flex items-center gap-3">
        <LinkThumb link={link} className="h-11 w-16 rounded-[10px]" />
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="flex items-center gap-1 text-[12px] font-semibold text-primary">
            <Check aria-hidden strokeWidth={3} className="size-3.5" />
            Saved to your links
          </p>
          <h2 className="truncate text-[14px] font-bold">{savedTitle(link, pageTitle)}</h2>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex h-[30px] max-w-full items-center rounded-full bg-accent px-3 text-[12.5px] font-semibold">
          <span className="truncate">{locationLabel(filing.filed.map((collection) => collection.name))}</span>
        </span>
        <AddTo filedIds={new Set(filing.filed.map((collection) => collection.id))} onFile={filing.setFiledIn} />
      </div>
      <FiledGroups linkId={link.id} filed={filing.filed} initial={link.collections} />
      <div className={cn("grid gap-1.5", canRead(link) ? "grid-cols-4" : "grid-cols-3")}>
        <button
          type="button"
          aria-pressed={pin.pinned}
          onClick={pin.toggle}
          className={cn(TILE, "h-[52px] text-[11.5px]", pin.pinned ? "bg-foreground text-background" : "bg-accent hover:bg-line-strong")}
        >
          <Pin aria-hidden strokeWidth={2.2} className={cn("size-4", pin.pinned && "animate-pin-pop fill-current")} />
          {pin.pinned ? "Pinned" : "Pin"}
        </button>
        {canRead(link) ? (
          <TileLink href={appUrl(`/l/${link.id}/read`)} icon={<BookOpen aria-hidden className="size-4" />}>
            Read
          </TileLink>
        ) : null}
        <button type="button" onClick={() => void share.copy(link.originalUrl)} className={cn(TILE, "h-[52px] bg-accent text-[11.5px] hover:bg-line-strong")}>
          <Link2 aria-hidden className="size-4" />
          {SHARE_LABELS[share.state]}
        </button>
        <TileLink href={appUrl(`/l/${link.id}`)} icon={<ExternalLink aria-hidden className="size-4" />}>
          Open app
        </TileLink>
      </div>
      <p role="status" className="sr-only">
        {share.state === "copied" ? "Link copied" : null}
      </p>
      {problem ? <Alert>{problem}</Alert> : null}
    </Section>
  );
}

function TileLink({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={cn(TILE, "h-[52px] bg-accent text-[11.5px] hover:bg-line-strong")}>
      {icon}
      {children}
    </a>
  );
}

type AddToProps = Parameters<typeof CollectionPicker>[0];

// A floating popover, so opening it never pushes the panel's layout down.
function AddTo({ filedIds, onFile }: AddToProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => { setOpen(!open); }}
        className="h-[30px] rounded-full px-2.5 text-[12.5px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        + Add to
      </button>
      {open ? (
        <div id={popoverId} className="absolute top-full left-0 z-20 mt-1.5 w-[min(300px,calc(100vw-48px))] animate-pop rounded-2xl border border-line-strong bg-card pt-3 shadow-2xl">
          <CollectionPicker filedIds={filedIds} onFile={onFile} />
        </div>
      ) : null}
    </div>
  );
}
