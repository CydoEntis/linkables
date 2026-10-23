import type { SavedLink } from "@linkables/shared/links";
import { useEffect, useRef, useState, type RefObject } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { neighbourRowLink } from "../links/LinkRow";
import { useLinksUi } from "../links/links-ui-store";
import { useDeleteLink } from "../links/use-delete-link";
import { DetailsBody } from "./DetailsBody";
import { useLinkDetails } from "./details-search";
import { readStoredWidth, storeWidth } from "./panel-width";
import { ResizeGrip } from "./ResizeGrip";
import { useDetailsLink } from "./use-details-link";
import { useWideScreen } from "./use-wide-screen";
import { wrapTab } from "./wrap-tab";

// The open link's details: a resizable side panel beside the list on the web,
// a full-screen sheet on phones.
export function LinkDetails() {
  const { linkId, close } = useLinkDetails();
  const wide = useWideScreen();
  if (linkId === undefined) return null;
  return wide ? <DetailsPanel linkId={linkId} onClose={close} /> : <DetailsSheet linkId={linkId} onClose={close} />;
}

type DetailsProps = { linkId: string; onClose: () => void };

function useDetails({ linkId, onClose }: DetailsProps) {
  const details = useDetailsLink(linkId);
  const deleteLink = useDeleteLink();
  return {
    details,
    onDelete: (link: SavedLink) => {
      deleteLink(link.id);
      onClose();
    },
  };
}

// No scrim: the list stays usable, and clicking another row swaps the content.
function DetailsPanel({ linkId, onClose }: DetailsProps) {
  const { details, onDelete } = useDetails({ linkId, onClose });
  const [width, setWidth] = useState(readStoredWidth);
  const panelRef = useRef<HTMLElement | null>(null);

  // Opening a link, or swapping to another, takes keyboard users to it.
  useEffect(() => {
    panelRef.current?.focus({ preventScroll: true });
  }, [linkId]);
  useReturnFocusToRow(panelRef, linkId);

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-label="Link details"
      onKeyDown={(event) => {
        // Keys from the portalled picker bubble here through React; Esc there closes only the picker.
        if (event.key !== "Escape" || event.defaultPrevented || !event.currentTarget.contains(event.target as Node)) return;
        event.preventDefault();
        onClose();
      }}
      style={{ width }}
      className="fixed inset-y-0 right-0 z-40 flex max-w-[calc(100%-300px)] animate-panel-in flex-col bg-card shadow-[-1px_0_0_var(--line-strong),-30px_0_80px_-30px_rgb(0_0_0/0.8)] outline-none"
    >
      <ResizeGrip width={width} onResize={setWidth} onResizeEnd={storeWidth} />
      <DetailsBody details={details} onClose={onClose} onDelete={onDelete} />
    </section>
  );
}

// Closing hands focus back to the row it came from, or to the next row when the
// link was deleted, if focus was in the panel (or lost to the page as it went).
function useReturnFocusToRow(panelRef: RefObject<HTMLElement | null>, linkId: string) {
  const openId = useRef(linkId);
  useEffect(() => {
    openId.current = linkId;
  }, [linkId]);
  useEffect(() => {
    const panel = panelRef.current;
    return () => {
      const active = document.activeElement;
      if (active !== null && active !== document.body && !panel?.contains(active)) return;
      const row = document.querySelector<HTMLElement>(`[data-row-link][data-link-id="${openId.current}"]`);
      const deleted = useLinksUi.getState().deletingIds.includes(openId.current);
      (row && deleted ? neighbourRowLink(row) : row)?.focus();
    };
  }, [panelRef]);
}

function DetailsSheet({ linkId, onClose }: DetailsProps) {
  const { details, onDelete } = useDetails({ linkId, onClose });
  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent
        aria-label="Link details"
        onKeyDown={wrapTab}
        className="inset-0 animate-sheet-up gap-0 bg-background pt-[env(safe-area-inset-top)]"
      >
        <SheetTitle className="sr-only">Link details</SheetTitle>
        <DetailsBody details={details} onClose={onClose} onDelete={onDelete} />
      </SheetContent>
    </Sheet>
  );
}
