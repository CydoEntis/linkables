import type { ListedCollection } from "@linkables/shared/collections";
import { cn } from "cn";
import { Check, EyeOff, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { displayName } from "../collections/picker";
import { useCopy, type CopyState } from "../copy/use-copy";
import { Alert, PRIMARY_BUTTON } from "../ui";
import { linkCount } from "./link-list";
import { ShareScope } from "./ShareScope";
import { sharedUrl, useSetSharing, useShareTokens } from "./queries";
import { Mosaic } from "./Thumb";
import { useTwoTap } from "./use-two-tap";

const TURN_OFF_HINT = "The link stops working right away. Turning it on later makes a new one.";

const COPY_LABELS: Record<CopyState, string> = { idle: "Copy", copied: "Copied ✓", failed: "Couldn't copy" };

type ShareSheetProps = { collection: ListedCollection | null; onClose: () => void };

// A native modal dialog: it traps focus, closes on Escape and draws its own scrim.
export function ShareSheet({ collection, onClose }: ShareSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (collection && element && !element.open) element.showModal();
  }, [collection]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current?.close();
      }}
      className="mx-0 mt-auto mb-0 max-h-[85vh] w-full max-w-none animate-sheet-up rounded-t-[26px] bg-card text-foreground backdrop:bg-black/55"
    >
      {collection ? <ShareContent collection={collection} titleId={titleId} onDone={() => dialog.current?.close()} /> : null}
    </dialog>
  );
}

type ShareContentProps = { collection: ListedCollection; titleId: string; onDone: () => void };

function ShareContent({ collection, titleId, onDone }: ShareContentProps) {
  const tokens = useShareTokens();
  const token = tokens.data?.get(collection.id);
  const name = displayName(collection.name);
  const on = token !== undefined;
  // Turning the link on or off swaps the button that was pressed for another, so
  // focus moves to the new one and the change is announced; opening the sheet does neither.
  const [shownOn, setShownOn] = useState<boolean | null>(null);
  const [changed, setChanged] = useState(false);
  if (!tokens.isPending && shownOn !== on) {
    if (shownOn !== null) setChanged(true);
    setShownOn(on);
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <header className="flex items-center gap-3">
        <Mosaic name={collection.name} cover={collection.cover} className="size-11 rounded-[11px]" />
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id={titleId} className="truncate text-[16px] font-bold">
            Share “{name}”
          </h2>
          <p className="text-[12.5px] text-muted-foreground">
            {linkCount(collection.linkCount)} · {token ? "anyone with the link can view" : "only you can see it"}
          </p>
        </div>
        <button type="button" aria-label="Close" onClick={onDone} className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <X aria-hidden className="size-4" />
        </button>
      </header>
      {tokens.isPending ? (
        <div aria-busy className="h-24 animate-pulse rounded-xl bg-muted" />
      ) : token ? (
        <LinkOn collectionId={collection.id} token={token} focusFirst={changed} />
      ) : (
        <LinkOff collectionId={collection.id} focusFirst={changed} />
      )}
      <ShareScope collectionId={collection.id} />
      <p role="status" className="sr-only">
        {changed ? (on ? "Link is on. Anyone with it can view." : "Link turned off. It no longer works.") : null}
      </p>
    </div>
  );
}

type LinkStateProps = { collectionId: string; focusFirst: boolean };

function LinkOff({ collectionId, focusFirst }: LinkStateProps) {
  const setSharing = useSetSharing(collectionId);
  return (
    <>
      <div className="flex flex-col gap-2 rounded-xl bg-muted p-3.5 text-[12.5px]">
        <p className="text-soft-foreground">Anyone with the link can see this collection's links, without an account.</p>
        <p className="flex items-center gap-2">
          <Check aria-hidden className="size-3.5 text-primary" />
          Titles, images and descriptions
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <EyeOff aria-hidden className="size-3.5" />
          Never your notes, pins or name
        </p>
      </div>
      {/* aria-disabled, not disabled, so focus stays on the button while it works. */}
      <button
        type="button"
        autoFocus={focusFirst}
        aria-disabled={setSharing.isPending || undefined}
        onClick={() => {
          if (!setSharing.isPending) setSharing.mutate(true);
        }}
        className={PRIMARY_BUTTON}
      >
        {setSharing.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
        {setSharing.isPending ? "Making link…" : "Get share link"}
      </button>
      {setSharing.isError ? <Alert>Couldn't make the link. Try again.</Alert> : null}
    </>
  );
}

function LinkOn({ collectionId, token, focusFirst }: LinkStateProps & { token: string }) {
  const setSharing = useSetSharing(collectionId);
  const copy = useCopy();
  const turnOff = useTwoTap(() => { setSharing.mutate(false); }, setSharing.isPending);
  const url = sharedUrl(token);
  const prefix = url.slice(0, url.length - token.length).replace(/^https?:\/\//, "");

  return (
    <>
      <p className="flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-[12.5px] font-semibold text-primary">
        <span aria-hidden className="size-2 rounded-full bg-primary" />
        Link is on
      </p>
      <p aria-label="Share link" className="flex rounded-[10px] bg-muted px-3 py-2.5 font-mono text-[12.5px] whitespace-nowrap">
        <span className="shrink-0 text-muted-foreground">{prefix}</span>
        <span className="truncate">{token}</span>
      </p>
      <button type="button" autoFocus={focusFirst} onClick={() => void copy.copy(url)} className={PRIMARY_BUTTON}>
        {COPY_LABELS[copy.state]}
      </button>
      <p role="status" className="sr-only">
        {copy.state === "copied" ? "Link copied" : null}
      </p>
      <div className="flex flex-col items-end">
        <button
          type="button"
          aria-disabled={setSharing.isPending || undefined}
          onClick={turnOff.press}
          className={cn(
            "flex h-9 items-center gap-2 rounded-[10px] px-3 text-[13.5px] font-bold",
            turnOff.armed ? "bg-destructive/15 text-destructive" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {setSharing.isPending ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
          {turnOff.armed ? "Tap again to turn off" : "Turn off link"}
        </button>
        {/* Always rendered, so screen readers are listening when the hint appears. */}
        <p aria-live="polite" className={cn("text-right text-[12px] text-muted-foreground", turnOff.armed && "mt-1")}>
          {turnOff.armed ? TURN_OFF_HINT : ""}
        </p>
      </div>
      {setSharing.isError ? <Alert>Couldn't turn the link off. Try again.</Alert> : null}
    </>
  );
}
