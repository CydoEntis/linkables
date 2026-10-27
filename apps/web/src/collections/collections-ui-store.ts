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
  // Session only: sections folded on the collection page, by group id (or "<collectionId>:none" for the ungrouped one).
  collapsed: Readonly<Record<string, true>>;
  toggleCollapsed: (sectionId: string) => void;
  // The collection whose "New group" field is open.
  creatingGroupIn: string | null;
  setCreatingGroupIn: (collectionId: string | null) => void;
  // The collection on screen while it has groups: the Add to… picker offers its groups.
  groupedCollectionId: string | null;
  setGroupedCollectionId: (collectionId: string | null) => void;
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
  collapsed: {},
  toggleCollapsed: (sectionId) => {
    const { [sectionId]: folded, ...rest } = get().collapsed;
    set({ collapsed: folded ? rest : { ...rest, [sectionId]: true } });
  },
  creatingGroupIn: null,
  setCreatingGroupIn: (collectionId) => { set({ creatingGroupIn: collectionId }); },
  groupedCollectionId: null,
  setGroupedCollectionId: (collectionId) => { set({ groupedCollectionId: collectionId }); },
}));
