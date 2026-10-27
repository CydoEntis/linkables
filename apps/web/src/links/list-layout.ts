import { create } from "zustand";
import { BIG_SCREEN_QUERY, useMediaQuery, useWideScreen } from "../shell/use-wide-screen";

export type ListLayout = "grid" | "list";

export const LIST_LAYOUT_KEY = "linkables.listLayout";

// Storage is a convenience: blocked or cleared site data falls back to the screen's default.
function readChoice(): ListLayout | null {
  try {
    const stored = localStorage.getItem(LIST_LAYOUT_KEY);
    return stored === "grid" || stored === "list" ? stored : null;
  } catch (error) {
    if (error instanceof DOMException) return null;
    throw error;
  }
}

function storeChoice(layout: ListLayout): void {
  try {
    localStorage.setItem(LIST_LAYOUT_KEY, layout);
  } catch (error) {
    if (!(error instanceof DOMException)) throw error;
  }
}

type LayoutChoice = { choice: ListLayout | null; choose: (layout: ListLayout) => void };

export const useLayoutChoice = create<LayoutChoice>()((set) => ({
  choice: readChoice(),
  choose: (layout) => {
    storeChoice(layout);
    set({ choice: layout });
  },
}));

// Phones always get the list. On a computer the device's own choice wins; without
// one, big screens open on the grid.
export function resolveLayout(choice: ListLayout | null, screen: { wide: boolean; big: boolean }): ListLayout {
  if (!screen.wide) return "list";
  return choice ?? (screen.big ? "grid" : "list");
}

export function useListLayout(): ListLayout {
  const choice = useLayoutChoice((state) => state.choice);
  return resolveLayout(choice, { wide: useWideScreen(), big: useMediaQuery(BIG_SCREEN_QUERY) });
}
