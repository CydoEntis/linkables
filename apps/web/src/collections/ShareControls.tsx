import type { ListedCollection } from "@linkables/shared/collections";
import type { ShareState } from "@linkables/shared/sharing";
import { cn } from "cn";
import { ChevronDown, Copy, ExternalLink, Link2Off, LoaderCircle, Share } from "lucide-react";
import { useEffect, useRef, useState, type Ref } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyLink } from "../links/share-link";
import { copyWhenReady } from "../sharing/copy-when-ready";
import { canSend, sendLink } from "../sharing/send-link";
import { TURN_OFF_HINT, useTwoTap } from "../sharing/use-two-tap";
import { sharedPrefix, sharedUrl, useSetSharing, useShareToken } from "../sharing/use-share";
import { displayName } from "./display-name";

type ShareControlsProps = { collection: ListedCollection; wide: boolean };

// On phones the + button is the screen's lime action, so sharing steps back to ghost.
function variantFor(wide: boolean) {
  return wide ? "default" : "ghost";
}

export function ShareControls({ collection, wide }: ShareControlsProps) {
  const token = useShareToken(collection.id);
  const shareRef = useRef<HTMLButtonElement>(null);
  const copyRef = useRef<HTMLButtonElement>(null);
  const focusNext = useRef<"share" | "copy" | null>(null);

  // Turning the link on or off swaps the control that was clicked for another,
  // which drops focus to the page; this hands it to the control that replaced it.
  useEffect(() => {
    const want = token === undefined ? "share" : "copy";
    if (focusNext.current !== want) return;
    focusNext.current = null;
    if (document.activeElement === document.body) (want === "share" ? shareRef : copyRef).current?.focus();
  }, [token]);

  if (token === undefined) {
    return <ShareButton ref={shareRef} collectionId={collection.id} wide={wide} onShared={() => { focusNext.current = "copy"; }} />;
  }
  return (
    <div className="flex gap-px">
      <SendOrCopy ref={copyRef} url={sharedUrl(token)} title={displayName(collection.name)} wide={wide} />
      <ShareMenu
        collectionId={collection.id}
        token={token}
        title={displayName(collection.name)}
        wide={wide}
        onTurnedOff={() => { focusNext.current = "share"; }}
      />
    </div>
  );
}

function urlOf({ token }: ShareState): string {
  if (token === null) throw new Error("Turning the link on returned no token");
  return sharedUrl(token);
}

// Call synchronously in the click: the clipboard write has to start inside it.
async function shareAndCopy(url: Promise<string>): Promise<void> {
  if (await copyWhenReady(url)) {
    toast("Link copied · anyone with it can view");
    return;
  }
  const text = await url;
  toast("Link is on · anyone with it can view", { action: { label: "Copy", onClick: () => void copyLink(text) } });
}

type ShareButtonProps = { ref: Ref<HTMLButtonElement>; collectionId: string; wide: boolean; onShared: () => void };

function ShareButton({ ref, collectionId, wide, onShared }: ShareButtonProps) {
  const setSharing = useSetSharing(collectionId);
  const pending = setSharing.isPending;

  function share() {
    if (pending) return;
    const made = setSharing.mutateAsync(true).then((state) => {
      onShared();
      return urlOf(state);
    });
    shareAndCopy(made).catch(() => {
      toast.error("Couldn't make the link. Try again.");
    });
  }

  return (
    // Not disabled while pending, so it keeps its colour and focus behind the spinner.
    <Button ref={ref} variant={variantFor(wide)} size="touch" aria-busy={pending} onClick={share} className="px-4 font-bold md:h-10">
      {pending ? <LoaderCircle aria-hidden className="size-[15px] animate-spin" /> : <Share aria-hidden className="size-[15px]" />}
      Share
    </Button>
  );
}

type SendOrCopyProps = { ref: Ref<HTMLButtonElement>; url: string; title: string; wide: boolean };

function SendOrCopy({ ref, url, title, wide }: SendOrCopyProps) {
  const send = !wide && canSend();
  return (
    <Button
      ref={ref}
      aria-description={url}
      variant={variantFor(wide)}
      size="touch"
      onClick={() => void (send ? sendLink(url, title) : copyLink(url))}
      className="rounded-r-none px-4 font-bold md:h-10"
    >
      {send ? <Share aria-hidden className="size-[15px]" /> : <Copy aria-hidden className="size-[15px]" />}
      {send ? "Send link…" : "Copy link"}
    </Button>
  );
}

type ShareMenuProps = { collectionId: string; token: string; title: string; wide: boolean; onTurnedOff: () => void };

function ShareMenu({ collectionId, token, title, wide, onTurnedOff }: ShareMenuProps) {
  const [open, setOpen] = useState(false);
  const setSharing = useSetSharing(collectionId);
  const url = sharedUrl(token);

  // A promise, not mutate's callbacks: the menu unmounts as soon as the link is gone.
  function turnOff() {
    setSharing.mutateAsync(false).then(
      () => {
        setOpen(false);
        onTurnedOff();
        toast("Link turned off. It no longer works.");
      },
      () => { toast.error("Couldn't turn the link off. Try again."); },
    );
  }

  const turnOffTap = useTwoTap(turnOff, setSharing.isPending);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) turnOffTap.reset();
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label="Sharing options"
        title="Sharing options"
        className={buttonVariants({ variant: variantFor(wide), size: "touch", className: "w-11 rounded-l-none px-0 md:h-10 md:w-9" })}
      >
        <ChevronDown aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 max-w-[calc(100vw-32px)]">
        <p className="flex px-2.5 pt-1.5 pb-2 font-mono text-[12.5px] whitespace-nowrap">
          <span className="shrink-0 text-muted-foreground">{sharedPrefix()}</span>
          <span className="truncate">{token}</span>
        </p>
        <DropdownMenuItem aria-description={url} onClick={() => void copyLink(url)}>
          <Copy aria-hidden className="text-muted-foreground" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuLinkItem href={url} target="_blank" rel="noopener noreferrer" closeOnClick>
          <ExternalLink aria-hidden className="text-muted-foreground" />
          Open shared page
        </DropdownMenuLinkItem>
        {!wide && canSend() ? (
          <DropdownMenuItem onClick={() => void sendLink(url, title)}>
            <Share aria-hidden className="text-muted-foreground" />
            Send…
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <TurnOffItem armed={turnOffTap.armed} pending={setSharing.isPending} onPress={turnOffTap.press} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function TurnOffItem({ armed, pending, onPress }: { armed: boolean; pending: boolean; onPress: () => void }) {
  return (
    <>
      <DropdownMenuItem
        closeOnClick={false}
        aria-disabled={pending || undefined}
        onClick={onPress}
        className={cn(armed ? "text-destructive data-highlighted:bg-destructive/16" : "text-muted-foreground data-highlighted:text-foreground")}
      >
        {pending ? <LoaderCircle aria-hidden className="animate-spin" /> : <Link2Off aria-hidden />}
        {armed ? "Tap again to turn off" : "Turn off link"}
      </DropdownMenuItem>
      {/* Always rendered, so screen readers are listening when the hint appears. */}
      <p aria-live="polite" className={cn("px-2.5 text-[12.5px] leading-normal text-muted-foreground", armed && "pt-1 pb-1.5")}>
        {armed ? TURN_OFF_HINT : ""}
      </p>
    </>
  );
}
