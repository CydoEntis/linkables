import { useCallback, useSyncExternalStore } from "react";

// Tailwind's md breakpoint: from here up the web layout has the sidebar and a side panel.
const WIDE_QUERY = "(min-width: 48rem)";
// The 3xl and 4xl breakpoints in index.css (1800 and 2200 px).
export const BIG_SCREEN_QUERY = "(min-width: 112.5rem)";
export const HUGE_SCREEN_QUERY = "(min-width: 137.5rem)";

function subscribeToResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => { window.removeEventListener("resize", onChange); };
}

export function useViewportWidth(): number {
  return useSyncExternalStore(subscribeToResize, () => window.innerWidth);
}

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
