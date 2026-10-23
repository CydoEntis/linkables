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
};

const HIGHLIGHT_MS = 1500;

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
}));
