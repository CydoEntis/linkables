import { useSyncExternalStore } from "react";

// The bookmark button opens /save at 420 × 640. The window's size decides, not a
// URL flag, so no link can switch the layout. The fine pointer keeps small
// phones, where window.close() does nothing, on the full-screen layout.
const POPUP_QUERY = "(max-width: 520px) and (max-height: 760px) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(POPUP_QUERY);
  query.addEventListener("change", onChange);
  return () => { query.removeEventListener("change", onChange); };
}

export function usePopupWindow(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(POPUP_QUERY).matches);
}
