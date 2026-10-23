import { Bookmark, Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { buildBookmarklet } from "./bookmarklet";

type BookmarkletDialogProps = { open: boolean; onOpenChange: (open: boolean) => void };

const DRAG_HINT = "Drag it to your bookmarks bar, or use Copy the link.";
const PASTE_HINT = "Now add a bookmark and paste this as its address.";

export function BookmarkletDialog({ open, onOpenChange }: BookmarkletDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Get the bookmark button</DialogTitle>
        <DialogDescription>Drag this to your bookmarks bar</DialogDescription>
        <BookmarkletPanel />
      </DialogContent>
    </Dialog>
  );
}

// The draggable button with its copy fallback, also shown on Save from anywhere.
export function BookmarkletPanel() {
  const href = buildBookmarklet(window.location.origin);
  const [hint, setHint] = useState("");
  return (
    <>
      <div className="flex justify-center rounded-2xl bg-muted py-7">
        <BookmarkletButton href={href} onClick={() => { setHint(DRAG_HINT); }} />
      </div>
      <div className="flex flex-col gap-2">
        <CopyLink href={href} onCopied={() => { setHint(PASTE_HINT); }} />
        {/* Mounted before it has text: a live region added together with its text is often not read out. */}
        <p role="status" className="text-center text-[13px] text-muted-foreground">
          {hint}
        </p>
      </div>
    </>
  );
}

// React swaps any javascript: href for one that throws, as an XSS guard. This
// one is built by the app from its own origin, so it is set on the element
// after render instead.
function BookmarkletButton({ href, onClick }: { href: string; onClick: () => void }) {
  return (
    <a
      ref={(node) => { node?.setAttribute("href", href); }}
      // Following the link here would save the linkables page itself; the button is for dragging.
      onClick={(event) => {
        event.preventDefault();
        onClick();
      }}
      className="flex h-11 cursor-grab items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-bold text-primary-foreground active:cursor-grabbing"
    >
      <Bookmark aria-hidden className="size-4" />
      Save to linkables
    </a>
  );
}

// Some browsers will not let a javascript: link be dragged into the bookmarks bar.
function CopyLink({ href, onCopied }: { href: string; onCopied: () => void }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(href).then(
      () => {
        setCopied(true);
        onCopied();
      },
      () => { toast.error("Couldn't copy the link."); },
    );
  }

  return (
    <Button variant="ghost" size="touch" onClick={copy}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied" : "Copy the link"}
    </Button>
  );
}
