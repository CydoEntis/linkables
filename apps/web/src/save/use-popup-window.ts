import { useSyncExternalStore } from "react";
import { POPUP_NAME } from "./bookmarklet";

// The bookmark button opens /save at 420 × 640 in a window it names. The name
// and size decide, not a URL flag, so no link can switch the layout. The name
// keeps a small tab the user opened, which script may not close, on the full
// layout; the fine pointer does the same for small phones.
const POPUP_QUERY = "(max-width: 520px) and (max-height: 760px) and (pointer: fine)";

function subscribe(onChange: () => void) {
  const query = window.matchMedia(POPUP_QUERY);
  query.addEventListener("change", onChange);
  return () => { query.removeEventListener("change", onChange); };
}

export function usePopupWindow(): boolean {
  return useSyncExternalStore(subscribe, () => window.name === POPUP_NAME && window.matchMedia(POPUP_QUERY).matches);
}
