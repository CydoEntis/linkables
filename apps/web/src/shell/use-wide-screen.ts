import { useCallback, useSyncExternalStore } from "react";

// Tailwind's md breakpoint: from here up the web layout has the sidebar.
const WIDE_QUERY = "(min-width: 48rem)";
// The 3xl breakpoint in index.css (1800 px).
export const BIG_SCREEN_QUERY = "(min-width: 112.5rem)";

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => { list.removeEventListener("change", onChange); };
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches);
}

export function useWideScreen(): boolean {
  return useMediaQuery(WIDE_QUERY);
}
