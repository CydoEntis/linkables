import { Check, Copy, ExternalLink, Share } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { copyLink } from "../links/share-link";
import { TurnOffLinkButton } from "./TurnOffLinkButton";
import { sharedPrefix, sharedUrl } from "./use-share";

const COPIED_MS = 1800;

type ShareOnProps = { token: string; title: string; wide: boolean; turningOff: boolean; onTurnOff: () => void };

// Phones send through the system share sheet; a browser without one copies instead.
async function sendLink(url: string, title: string): Promise<void> {
  if (typeof navigator.share !== "function") {
    await copyLink(url);
    return;
  }
  try {
    await navigator.share({ title, url });
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
    if (error.name !== "AbortError") await copyLink(url);
  }
}

function useCopy(url: string): { copied: boolean; copy: () => void } {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => { setCopied(false); }, COPIED_MS);
    return () => { clearTimeout(timer); };
  }, [copied]);

  return { copied, copy: () => void copyLink(url).then(setCopied) };
}

export function ShareOn({ token, title, wide, turningOff, onTurnOff }: ShareOnProps) {
  const url = sharedUrl(token);
  const { copied, copy } = useCopy(url);
  const copiedMark = copied ? <Check aria-hidden strokeWidth={2.6} /> : null;
  const copyLabel = copied ? "Copied" : "Copy link";

  return (
    <>
      <p className="flex h-[42px] animate-fade-in items-center gap-2.5 rounded-xl bg-primary/10 px-3.5 text-[13.5px] font-semibold">
        <span aria-hidden className="size-2 rounded-full bg-primary shadow-[0_0_0_4px_oklch(0.89_0.19_125/0.22)]" />
        Link is on
      </p>
      <div className="flex animate-fade-up gap-2">
        <p className="flex h-[50px] min-w-0 flex-1 items-center overflow-hidden rounded-xl bg-muted px-3.5 font-mono text-[13.5px] whitespace-nowrap select-all">
          <span className="text-muted-foreground">{sharedPrefix()}</span>
          <span className="truncate">{token}</span>
        </p>
        {wide ? (
          <Button onClick={copy} className="h-[50px] min-w-32 px-[18px] text-[14.5px]">
            {copiedMark ?? <Copy aria-hidden />}
            {copyLabel}
          </Button>
        ) : null}
      </div>
      {wide ? null : (
        <div className="flex gap-2">
          <Button onClick={() => void sendLink(url, title)} className="h-[52px] flex-1 px-4 text-base">
            <Share aria-hidden className="size-[17px]" />
            Send link…
          </Button>
          <Button variant="ghost" onClick={copy} className="h-[52px] min-w-[118px] px-4 text-[15px] font-bold">
            {copiedMark}
            {copyLabel}
          </Button>
        </div>
      )}
      <div className="flex items-start justify-between gap-2.5 border-t border-border pt-3.5">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "ghost", className: "h-9 gap-2 bg-transparent px-2.5 text-[13.5px] font-bold inset-shadow-none hover:bg-muted" })}
        >
          See what viewers see
          <ExternalLink aria-hidden className="size-[13px]" />
        </a>
        <TurnOffLinkButton onConfirm={onTurnOff} pending={turningOff} />
      </div>
    </>
  );
}
