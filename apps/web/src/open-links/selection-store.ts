import type { SavedLink } from "@linkables/shared/links";
import { create } from "zustand";

// Client-only: the chosen links' saved URLs by id, so Open N needs no list lookup.
type Selection = {
  selecting: boolean;
  chosen: Readonly<Record<string, string>>;
  start: () => void;
  cancel: () => void;
  toggle: (link: SavedLink) => void;
  chooseAll: (links: readonly SavedLink[]) => void;
};

export const useSelection = create<Selection>()((set, get) => ({
  selecting: false,
  chosen: {},
  start: () => { set({ selecting: true, chosen: {} }); },
  cancel: () => { set({ selecting: false, chosen: {} }); },
  toggle: (link) => {
    const { [link.id]: was, ...rest } = get().chosen;
    set({ chosen: was === undefined ? { ...rest, [link.id]: link.originalUrl } : rest });
  },
  chooseAll: (links) => { set({ chosen: Object.fromEntries(links.map((link) => [link.id, link.originalUrl])) }); },
}));
