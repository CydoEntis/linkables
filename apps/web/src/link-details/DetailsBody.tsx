import type { SavedLink } from "@linkables/shared/links";
import { ArrowLeft } from "lucide-react";
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
          className="flex min-h-11 items-center rounded-md bg-primary px-4 text-[13.5px] font-bold text-primary-foreground md:min-h-9"
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
        <CollectionTags link={link} />
      </div>
      <DetailsActions link={link} onDelete={onDelete} />
      <SummaryCard />
      <NoteField link={link} />
    </>
  );
}

// Phase 4 fills this in, and must then say which source the summary came from.
function SummaryCard() {
  return (
    <section aria-label="Summary" className="flex flex-col gap-1.5 rounded-xl bg-muted px-4 py-3.5">
      <span className="flex items-center gap-2 text-xs font-bold">
        Summary
        <span className="rounded-full bg-accent px-[7px] py-0.5 text-[10.5px] font-semibold text-muted-foreground">Coming soon</span>
      </span>
      <p className="text-[13px] leading-[1.55] text-muted-foreground">
        A short summary of this page will show here. We'll always say if it came from the page text or only the title.
      </p>
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
