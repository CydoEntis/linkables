import type { SavedLink } from "@linkables/shared/links";
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { neighbourRowLink } from "../links/LinkRow";
import { useLinksUi } from "../links/links-ui-store";
import { useDeleteLink } from "../links/use-delete-link";
import { isEditable } from "../links/use-paste-to-save";
import { DetailsBody } from "./DetailsBody";
import { useLinkDetails } from "./details-search";
import { useDockedDetails, useShownLinkId } from "./docked-details";
import { clampWidth, maxPanelWidth, readStoredWidth, storeWidth } from "./panel-width";
import { ResizeGrip } from "./ResizeGrip";
import { useDetailsLink } from "./use-details-link";
import { useViewportWidth, useWideScreen } from "./use-wide-screen";

// The open link's details: a resizable side panel beside the list on the web,
// a full-screen sheet on phones, and a docked column on huge screens.
export function LinkDetails({ newestLinkId }: { newestLinkId?: string | undefined }) {
  const { linkId, close } = useLinkDetails();
  const { shownId, docked } = useShownLinkId(newestLinkId);
  const dismiss = useDockedDetails((state) => state.dismiss);
  const wide = useWideScreen();
  if (shownId === undefined) return null;
  if (docked) {
    const closeDocked = () => {
      dismiss();
      close();
    };
    // Deleting is not closing: the panel moves on to the next newest link.
    return <DockedPanel linkId={shownId} opened={linkId !== undefined} onClose={closeDocked} onDeleted={close} />;
  }
  return wide ? <DetailsPanel linkId={shownId} onClose={close} /> : <DetailsSheet linkId={shownId} onClose={close} />;
}

type DetailsProps = { linkId: string; onClose: () => void };

function useDetails({ linkId, onClose, onDeleted = onClose }: DetailsProps & { onDeleted?: () => void }) {
  const details = useDetailsLink(linkId);
  const deleteLink = useDeleteLink();
  return {
    details,
    onDelete: (link: SavedLink) => {
      deleteLink(link.id);
      onDeleted();
    },
  };
}

// Takes keyboard users to each link they open, hands focus back to its row on
// close, and closes on Esc. A docked panel showing the newest link by itself
// leaves focus where it is.
function usePanelFocus(linkId: string, onClose: () => void, takeFocus = true) {
  const panelRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (takeFocus) panelRef.current?.focus({ preventScroll: true });
  }, [linkId, takeFocus]);
  useReturnFocusToRow(panelRef, linkId, takeFocus);
  return { panelRef, onKeyDown: panelKeyHandler(onClose) };
}

// No scrim: the list stays usable, and clicking another row swaps the content.
function DetailsPanel({ linkId, onClose }: DetailsProps) {
  const { details, onDelete } = useDetails({ linkId, onClose });
  const [storedWidth, setWidth] = useState(readStoredWidth);
  // A narrower window shrinks the panel without forgetting the width the user chose.
  const maxWidth = maxPanelWidth(useViewportWidth());
  const width = clampWidth(storedWidth, maxWidth);
  const { panelRef, onKeyDown } = usePanelFocus(linkId, onClose);

  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-label="Link details"
      onKeyDown={onKeyDown}
      style={{ width }}
      className="fixed inset-y-0 right-0 z-40 flex animate-panel-in flex-col bg-card shadow-[-1px_0_0_var(--line-strong),-30px_0_80px_-30px_rgb(0_0_0/0.8)] outline-none"
    >
      <ResizeGrip width={width} maxWidth={maxWidth} onResize={setWidth} onResizeEnd={storeWidth} />
      <DetailsBody details={details} onClose={onClose} onDelete={onDelete} />
    </section>
  );
}

// A fixed third column; data-docked-details makes the shell leave room for it.
function DockedPanel({ linkId, opened, onClose, onDeleted }: DetailsProps & { opened: boolean; onDeleted: () => void }) {
  const { details, onDelete } = useDetails({ linkId, onClose, onDeleted });
  const { panelRef, onKeyDown } = usePanelFocus(linkId, onClose, opened);
  return (
    <section
      ref={panelRef}
      tabIndex={-1}
      aria-label="Link details"
      data-docked-details
      onKeyDown={onKeyDown}
      className="fixed inset-y-0 right-0 z-30 flex w-[480px] animate-fade-in flex-col border-l border-border bg-background outline-none"
    >
      <DetailsBody details={details} onClose={onClose} onDelete={onDelete} />
    </section>
  );
}

// Keys from the portalled picker bubble here through React, so only keys from
// the panel's own DOM count: Esc closes the panel (in the picker it closes only
// the picker), and Ctrl/⌘ K stays with the title or note being typed in instead
// of opening the list's command palette.
function panelKeyHandler(onClose: () => void) {
  return (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || !event.currentTarget.contains(event.target as Node)) return;
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k" && isEditable(event.target)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
}

// Closing hands focus back to the row it came from, or to the next row when the
// link was deleted, if focus was in the panel (or lost to the page as it went).
// A panel that opened by itself and never held focus leaves focus alone, so a
// docked panel going away on resize does not pull focus to a row.
function useReturnFocusToRow(panelRef: RefObject<HTMLElement | null>, linkId: string, tookFocus: boolean) {
  const openId = useRef(linkId);
  const took = useRef(tookFocus);
  useEffect(() => {
    openId.current = linkId;
    took.current = tookFocus;
  }, [linkId, tookFocus]);
  useEffect(() => {
    const panel = panelRef.current;
    return () => {
      const active = document.activeElement;
      const inPanel = active !== null && Boolean(panel?.contains(active));
      if (!inPanel && (!took.current || (active !== null && active !== document.body))) return;
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
        className="inset-0 animate-sheet-up gap-0 bg-background pt-[env(safe-area-inset-top)]"
      >
        <SheetTitle className="sr-only">Link details</SheetTitle>
        <DetailsBody details={details} onClose={onClose} onDelete={onDelete} />
      </SheetContent>
    </Sheet>
  );
}
