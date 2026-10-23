import { create } from "zustand";

type CollectionsUi = {
  // Deleted on this device but still inside their Undo window, so hidden everywhere.
  deletingIds: readonly string[];
  hide: (collectionId: string) => void;
  unhide: (collectionId: string) => void;
  // A sidebar collection that just took a dropped link springs once.
  bumpId: string | null;
  bump: (collectionId: string) => void;
};

const BUMP_MS = 500;

export const useCollectionsUi = create<CollectionsUi>()((set, get) => ({
  deletingIds: [],
  hide: (collectionId) => { set({ deletingIds: [...get().deletingIds, collectionId] }); },
  unhide: (collectionId) => { set({ deletingIds: get().deletingIds.filter((id) => id !== collectionId) }); },
  bumpId: null,
  bump: (collectionId) => {
    set({ bumpId: collectionId });
    setTimeout(() => { if (get().bumpId === collectionId) set({ bumpId: null }); }, BUMP_MS);
  },
}));
