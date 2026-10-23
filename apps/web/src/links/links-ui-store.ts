import { create } from "zustand";

// Client-only UI state for the links view; server data stays in TanStack Query.
type LinksUi = {
  saveSheetOpen: boolean;
  setSaveSheetOpen: (open: boolean) => void;
  // The newly saved row hops in; an already-saved row flashes.
  hopId: string | null;
  flashId: string | null;
  hop: (linkId: string) => void;
  flash: (linkId: string) => void;
  // A row filed out of the current list plays its leave animation before it goes.
  leavingIds: readonly string[];
  leave: (linkId: string) => void;
  // The row whose Add to… popover is open stays put until the popover closes.
  heldId: string | null;
  setHeldId: (linkId: string | null) => void;
  // Ids only: the links themselves stay in the Query cache (ADR-0006).
  addToLinkId: string | null;
  setAddToLinkId: (linkId: string | null) => void;
  swipeOpenId: string | null;
  setSwipeOpenId: (linkId: string | null) => void;
  draggingId: string | null;
  setDraggingId: (linkId: string | null) => void;
  // Deleted on this device but still inside the Undo window: hidden everywhere.
  deletingIds: readonly string[];
  startDeleting: (linkId: string) => void;
  stopDeleting: (linkId: string) => void;
};

const HIGHLIGHT_MS = 1500;
export const LEAVE_MS = 220;

// One timer per link: a second leave restarts the window instead of an earlier
// timer ending it early.
const leaveTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useLinksUi = create<LinksUi>()((set, get) => ({
  saveSheetOpen: false,
  setSaveSheetOpen: (open) => { set({ saveSheetOpen: open }); },
  hopId: null,
  flashId: null,
  hop: (linkId) => {
    set({ hopId: linkId });
    setTimeout(() => { if (get().hopId === linkId) set({ hopId: null }); }, HIGHLIGHT_MS);
  },
  flash: (linkId) => {
    set({ flashId: linkId });
    setTimeout(() => { if (get().flashId === linkId) set({ flashId: null }); }, HIGHLIGHT_MS);
  },
  leavingIds: [],
  leave: (linkId) => {
    clearTimeout(leaveTimers.get(linkId));
    set({ leavingIds: [...get().leavingIds.filter((id) => id !== linkId), linkId] });
    leaveTimers.set(
      linkId,
      setTimeout(() => {
        leaveTimers.delete(linkId);
        set({ leavingIds: get().leavingIds.filter((id) => id !== linkId) });
      }, LEAVE_MS),
    );
  },
  heldId: null,
  setHeldId: (linkId) => { set({ heldId: linkId }); },
  addToLinkId: null,
  setAddToLinkId: (linkId) => { set({ addToLinkId: linkId }); },
  swipeOpenId: null,
  setSwipeOpenId: (linkId) => { set({ swipeOpenId: linkId }); },
  draggingId: null,
  setDraggingId: (linkId) => { set({ draggingId: linkId }); },
  deletingIds: [],
  startDeleting: (linkId) => { set({ deletingIds: [...get().deletingIds.filter((id) => id !== linkId), linkId] }); },
  stopDeleting: (linkId) => { set({ deletingIds: get().deletingIds.filter((id) => id !== linkId) }); },
}));
