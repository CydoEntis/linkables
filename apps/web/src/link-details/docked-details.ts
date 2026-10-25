import { create } from "zustand";
import { useLinkDetails } from "./details-search";
import { HUGE_SCREEN_QUERY, useMediaQuery } from "./use-wide-screen";

// Once closed, the docked panel stays closed for the visit; opening a link shows it again.
export const useDockedDetails = create<{ dismissed: boolean; dismiss: () => void }>()((set) => ({
  dismissed: false,
  dismiss: () => { set({ dismissed: true }); },
}));

// Huge screens dock the details panel beside the list, open on the newest link
// until the user opens another or closes it. Elsewhere only an opened link shows.
export function useShownLinkId(newestLinkId: string | undefined): { shownId: string | undefined; docked: boolean } {
  const { linkId } = useLinkDetails();
  const docked = useMediaQuery(HUGE_SCREEN_QUERY);
  const dismissed = useDockedDetails((state) => state.dismissed);
  return { shownId: linkId ?? (docked && !dismissed ? newestLinkId : undefined), docked };
}
