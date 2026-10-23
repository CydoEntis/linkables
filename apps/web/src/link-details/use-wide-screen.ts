import { useSyncExternalStore } from "react";

// Tailwind's md breakpoint: from here up the web layout has the sidebar and a side panel.
const WIDE_QUERY = "(min-width: 48rem)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => { query.removeEventListener("change", onChange); };
}

function subscribeToResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => { window.removeEventListener("resize", onChange); };
}

export function useViewportWidth(): number {
  return useSyncExternalStore(subscribeToResize, () => window.innerWidth);
}

export function useWideScreen(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE_QUERY).matches);
}
