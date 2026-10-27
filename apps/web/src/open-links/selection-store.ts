import type { SavedLink } from "@linkables/shared/links";
import { create } from "zustand";

// Client-only: the chosen links' saved URLs by id, so Open N needs no list lookup.
type Selection = {
  selecting: boolean;
  // Bumped on start and cancel, so a slow Select all can tell it was overtaken.
  session: number;
  chosen: Readonly<Record<string, string>>;
  start: () => void;
  cancel: () => void;
  toggle: (link: SavedLink) => void;
  chooseAll: (links: readonly SavedLink[]) => void;
  // Drops links that were deleted or filed out of the collection.
  drop: (ids: ReadonlySet<string>) => void;
};

export const useSelection = create<Selection>()((set, get) => ({
  selecting: false,
  session: 0,
  chosen: {},
  start: () => { set({ selecting: true, chosen: {}, session: get().session + 1 }); },
  cancel: () => { set({ selecting: false, chosen: {}, session: get().session + 1 }); },
  toggle: (link) => {
    const { [link.id]: was, ...rest } = get().chosen;
    set({ chosen: was === undefined ? { ...rest, [link.id]: link.originalUrl } : rest });
  },
  drop: (ids) => {
    const chosen = Object.fromEntries(Object.entries(get().chosen).filter(([id]) => !ids.has(id)));
    if (Object.keys(chosen).length !== Object.keys(get().chosen).length) set({ chosen });
  },
  chooseAll: (links) => { set({ chosen: Object.fromEntries(links.map((link) => [link.id, link.originalUrl])) }); },
}));
