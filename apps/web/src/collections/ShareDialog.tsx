import type { ListedCollection } from "@linkables/shared/collections";
import { Check, LoaderCircle } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { copyLink } from "../links/share-link";
import { sharedUrl, useSetSharing, useShareState } from "../sharing/use-share";
import { displayName } from "./display-name";
import { MiniCover } from "./MiniCover";

type ShareDialogProps = { collection: ListedCollection; open: boolean; onOpenChange: (open: boolean) => void };

const COPIED_MS = 2000;

export function linkCountLabel(count: number): string {
  return `${String(count)} ${count === 1 ? "link" : "links"}`;
}

export function ShareDialog({ collection, open, onOpenChange }: ShareDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <div className="flex items-center gap-3.5">
          <MiniCover name={collection.name} cover={collection.cover} className="size-14 rounded-[14px]" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <DialogTitle className="text-xl wrap-anywhere">Share “{displayName(collection.name)}”</DialogTitle>
            <DialogDescription className="text-[13px]">{linkCountLabel(collection.linkCount)} · anyone with the link can view</DialogDescription>
          </div>
        </div>
        <ShareLink collectionId={collection.id} open={open} />
      </DialogContent>
    </Dialog>
  );
}

function ShareLink({ collectionId, open }: { collectionId: string; open: boolean }) {
  const state = useShareState(collectionId, open);
  const setSharing = useSetSharing(collectionId);

  function turn(on: boolean) {
    setSharing.mutate(on, {
      onError: () => { toast.error(on ? "Couldn't turn the link on. Try again." : "Couldn't turn the link off. Try again."); },
    });
  }

  if (state.isPending) {
    return <p className="flex h-11 items-center text-sm text-muted-foreground">Checking the link…</p>;
  }
  if (state.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">Couldn't load the link.</p>
        <Button variant="ghost" size="touch" onClick={() => void state.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  const { token } = state.data;
  if (token === null) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">The link is off. Turn it on and anyone you send it to can see these links, without signing in.</p>
        <Button size="touch" disabled={setSharing.isPending} onClick={() => { turn(true); }} className="self-start font-semibold">
          {setSharing.isPending ? <LoaderCircle aria-hidden className="animate-spin" /> : null}
          Turn on link
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <LinkField url={sharedUrl(token)} />
      <p className="text-sm text-muted-foreground">Turning the link off stops it working right away. Turning it on again makes a new link.</p>
      <Button variant="ghost" size="touch" disabled={setSharing.isPending} onClick={() => { turn(false); }} className="self-start">
        Turn off link
      </Button>
    </div>
  );
}

function LinkField({ url }: { url: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => { setCopied(false); }, COPIED_MS);
    return () => { clearTimeout(timer); };
  }, [copied]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor={id} className="sr-only">
        Share link
      </label>
      <input
        id={id}
        readOnly
        value={url}
        onFocus={(event) => { event.currentTarget.select(); }}
        className="h-11 w-full min-w-0 rounded-md sm:flex-1 bg-muted px-3.5 font-mono text-[13px] text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
      />
      <Button
        size="touch"
        onClick={() => {
          void copyLink(url).then(setCopied);
        }}
        className="font-semibold active:scale-[.96]"
      >
        {copied ? <Check aria-hidden /> : null}
        {copied ? "Copied" : "Copy link"}
      </Button>
    </div>
  );
}
