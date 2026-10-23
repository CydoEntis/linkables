import { create } from "zustand";

// A collection deleted on this device but still inside its Undo window.
export type PendingDelete = { name: string; undo: () => void };

type CollectionsUi = {
  // Hidden everywhere until the DELETE is sent or undone.
  deleting: Readonly<Record<string, PendingDelete>>;
  startDeleting: (collectionId: string, pending: PendingDelete) => void;
  stopDeleting: (collectionId: string) => void;
  // A sidebar collection that just took a dropped link springs once.
  bumpId: string | null;
  bump: (collectionId: string) => void;
};

const BUMP_MS = 500;

export const useCollectionsUi = create<CollectionsUi>()((set, get) => ({
  deleting: {},
  startDeleting: (collectionId, pending) => { set({ deleting: { ...get().deleting, [collectionId]: pending } }); },
  stopDeleting: (collectionId) => {
    set({ deleting: Object.fromEntries(Object.entries(get().deleting).filter(([id]) => id !== collectionId)) });
  },
  bumpId: null,
  bump: (collectionId) => {
    set({ bumpId: collectionId });
    setTimeout(() => { if (get().bumpId === collectionId) set({ bumpId: null }); }, BUMP_MS);
  },
}));
