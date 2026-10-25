import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddToChromeLink, ChromeMark } from "./AddToChrome";
import { dismissExtensionCard, extensionCardDismissed } from "./extension-card";

// The sidebar's nudge towards the extension, until the user dismisses it on this device.
export function ExtensionCard() {
  const [dismissed, setDismissed] = useState(extensionCardDismissed);
  if (dismissed) return null;

  return (
    <section
      aria-labelledby="extension-card-title"
      className="relative flex shrink-0 animate-fade-in flex-col gap-3 rounded-[14px] border border-border bg-card p-3.5"
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss"
        onClick={() => {
          dismissExtensionCard();
          setDismissed(true);
        }}
        className="absolute top-2 right-2 bg-transparent text-subtle-foreground inset-shadow-none hover:bg-muted hover:text-foreground"
      >
        <X aria-hidden strokeWidth={2.2} className="size-3.5" />
      </Button>
      <div className="flex items-center gap-2.5 pr-6">
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-accent">
          <ChromeMark className="size-[17px]" />
        </span>
        <span className="flex flex-col gap-px">
          <span id="extension-card-title" className="text-sm font-bold">Chrome extension</span>
          <span className="text-[12.5px] text-muted-foreground">Save any tab in one click</span>
        </span>
      </div>
      <AddToChromeLink look={{ variant: "ghost", className: "h-9 rounded-[10px] bg-accent text-[13px] font-bold hover:bg-accent-hover" }}>
        Add to Chrome
      </AddToChromeLink>
    </section>
  );
}
