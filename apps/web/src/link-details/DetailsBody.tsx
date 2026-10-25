import type { SavedLink } from "@linkables/shared/links";
import { ArrowLeft } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { domainOf, safeHref, savedOnLabel } from "../links/link-display";
import { CollectionTags } from "./CollectionTags";
import { DetailsActions } from "./DetailsActions";
import { DetailsMedia } from "./DetailsMedia";
import { DetailsTitle } from "./DetailsTitle";
import type { DetailsLink } from "./use-details-link";
import { NoteField } from "./NoteField";

type DetailsBodyProps = { details: DetailsLink; onClose: () => void; onDelete: (link: SavedLink) => void };

// What the web panel and the phone sheet both show.
export function DetailsBody({ details, onClose, onDelete }: DetailsBodyProps) {
  const link = details.status === "found" ? details.link : null;
  return (
    <>
      <DetailsHeader link={link} onClose={onClose} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[18px] pt-1 pb-[calc(22px+env(safe-area-inset-bottom))]">
        {link ? (
          // Keyed so a swapped link starts with its own note and a closed title editor.
          <LinkFacts key={link.id} link={link} onDelete={() => { onDelete(link); }} />
        ) : details.status === "loading" ? (
          <p role="status" className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : details.status === "failed" ? (
          <LoadProblem onRetry={details.retry} />
        ) : (
          <Gone />
        )}
      </div>
    </>
  );
}

function DetailsHeader({ link, onClose }: { link: SavedLink | null; onClose: () => void }) {
  const href = link ? safeHref(link.originalUrl) : undefined;
  return (
    <div className="flex shrink-0 items-center gap-2 px-2.5 py-1.5 md:py-3.5">
      <button
        type="button"
        onClick={onClose}
        className="flex min-h-11 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground md:min-h-9"
      >
        <ArrowLeft aria-hidden strokeWidth={2.2} className="size-4" />
        Back
      </button>
      <span className="flex-1" />
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "touch", className: "px-4 text-[13.5px] md:h-9" })}
        >
          Open ↗<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : null}
    </div>
  );
}

function LinkFacts({ link, onDelete }: { link: SavedLink; onDelete: () => void }) {
  return (
    <>
      <DetailsMedia link={link} />
      <div className="flex flex-col gap-[5px]">
        <DetailsTitle link={link} />
        <p className="text-[13px] text-muted-foreground">
          {domainOf(link.originalUrl)} · {savedOnLabel(link, Date.now())}
        </p>
        <PageDescription text={link.resource.description} />
        <CollectionTags link={link} />
      </div>
      <DetailsActions link={link} onDelete={onDelete} />
      <NoteField link={link} />
    </>
  );
}

// The page's own text (its og:description). A summary, when it comes, must stay apart from it so neither passes for the other.
function PageDescription({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  return (
    <section aria-label="From the page" className="pt-1">
      <p className="line-clamp-3 text-[13.5px] leading-[1.5] text-muted-foreground wrap-anywhere">{text}</p>
    </section>
  );
}


function Gone() {
  return (
    <div className="flex flex-col gap-2 py-10">
      <p className="text-[17px] font-bold">Couldn't find this link</p>
      <p className="text-sm text-muted-foreground">It may have been deleted.</p>
    </div>
  );
}

function LoadProblem({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 py-10">
      <p className="text-[17px] font-bold">Couldn't load this link</p>
      <Button variant="ghost" size="touch" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
