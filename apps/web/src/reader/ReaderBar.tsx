import { useRouter } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { tileFor } from "../links/link-display";
import { OpenOriginal } from "./OpenOriginal";
import { TEXT_SIZES, type TextSize } from "./text-size";

// A plain text button on the bar: the shared Button without its surface.
export const QUIET = "bg-transparent inset-shadow-none text-muted-foreground hover:bg-muted hover:text-foreground";

type ReaderBarProps = {
  linkId: string;
  loading: boolean;
  // Only a loaded article fills the middle and gets the size control.
  article: { site: string; minutes: number; url: string } | null;
  textSize: TextSize;
  onTextSize: (size: TextSize) => void;
};

export function ReaderBar({ linkId, loading, article, textSize, onTextSize }: ReaderBarProps) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="relative flex h-14 items-center gap-2.5 px-2.5 md:h-[60px] md:px-5">
        <BackButton linkId={linkId} />
        <p className="flex min-w-0 flex-1 items-center justify-center gap-2 text-[13px] text-muted-foreground">
          {article ? <ReadingMeta site={article.site} minutes={article.minutes} /> : null}
        </p>
        {article ? <TextSizeControl value={textSize} onChange={onTextSize} /> : null}
        {article ? (
          <OpenOriginal url={article.url} variant="ghost" className="h-11 gap-2 px-3 text-[13.5px] md:h-[38px]">
            <ExternalLink aria-hidden strokeWidth={2.2} className="size-3.5" />
            <span className="max-md:sr-only">Open original</span>
          </OpenOriginal>
        ) : null}
        {loading ? <LoadingBar /> : null}
      </div>
    </header>
  );
}

// Back returns to wherever the reader was opened from; an address opened
// directly has nowhere to go back to, so it lands on the link's details.
function BackButton({ linkId }: { linkId: string }) {
  const router = useRouter();
  const back = () => {
    if (router.history.canGoBack()) router.history.back();
    else void router.navigate({ to: "/", search: { link: linkId } });
  };
  return (
    <Button variant="ghost" onClick={back} className={cn(QUIET, "h-11 gap-2 px-2.5 text-sm font-bold text-foreground md:h-[38px]")}>
      <ArrowLeft aria-hidden strokeWidth={2} className="size-[17px]" />
      <span className="max-md:sr-only">Back</span>
    </Button>
  );
}

function ReadingMeta({ site, minutes }: { site: string; minutes: number }) {
  return (
    <>
      <span aria-hidden className="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] bg-accent text-[10px] font-bold text-foreground">
        {tileFor(site).letter}
      </span>
      <span className="truncate">{site} · {String(minutes)} min read</span>
    </>
  );
}

const SIZE_LABELS = ["Smaller text", "Default text", "Larger text"] as const;
const GLYPH_SIZES = ["text-[12px]", "text-[15px]", "text-[18px]"] as const;

function TextSizeControl({ value, onChange }: { value: TextSize; onChange: (size: TextSize) => void }) {
  return (
    <div role="group" aria-label="Text size" className="flex shrink-0 gap-0.5 rounded-[10px] bg-muted p-[3px]">
      {TEXT_SIZES.map((size) => (
        <Button
          key={size}
          variant="ghost"
          aria-label={SIZE_LABELS[size]}
          aria-pressed={size === value}
          onClick={() => { onChange(size); }}
          className={cn(
            QUIET,
            "h-[30px] w-[34px] rounded-[7px] px-0 font-reader font-semibold",
            GLYPH_SIZES[size],
            size === value && "bg-accent text-foreground hover:bg-accent",
          )}
        >
          A
        </Button>
      ))}
    </div>
  );
}

function LoadingBar() {
  return (
    <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden">
      <span className="absolute inset-y-0 left-0 w-[40%] animate-reader-bar bg-primary" />
    </span>
  );
}
