import { Bookmark, Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildBookmarklet } from "./bookmarklet";

type BookmarkletDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

export function BookmarkletDialog({ open, onOpenChange }: BookmarkletDialogProps) {
  const href = buildBookmarklet(window.location.origin);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Get the bookmark button</DialogTitle>
        <DialogDescription>Drag this to your bookmarks bar</DialogDescription>
        <div className="flex justify-center rounded-2xl bg-muted py-7">
          <BookmarkletButton href={href} />
        </div>
        <CopyLink href={href} />
      </DialogContent>
    </Dialog>
  );
}

// React swaps any javascript: href for one that throws, as an XSS guard. This
// one is built by the app from its own origin, so it is set on the element
// after render instead.
function BookmarkletButton({ href }: { href: string }) {
  return (
    <a
      ref={(node) => { node?.setAttribute("href", href); }}
      // A click here would save the linkables page itself; the button is for dragging.
      onClick={(event) => { event.preventDefault(); }}
      className="flex h-11 cursor-grab items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-bold text-primary-foreground active:cursor-grabbing"
    >
      <Bookmark aria-hidden className="size-4" />
      Save to linkables
    </a>
  );
}

// Some browsers will not let a javascript: link be dragged into the bookmarks bar.
function CopyLink({ href }: { href: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(href).then(
      () => { setCopied(true); },
      () => { toast.error("Couldn't copy the link."); },
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="ghost" size="touch" onClick={copy}>
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? "Copied" : "Copy the link"}
      </Button>
      {copied ? (
        <p role="status" className="text-center text-[13px] text-muted-foreground">
          Now add a bookmark and paste this as its address.
        </p>
      ) : null}
    </div>
  );
}
