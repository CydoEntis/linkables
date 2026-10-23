import type { SavedLink } from "@linkables/shared/links";
import { useState } from "react";
import { useLinksUi } from "./links-ui-store";

type Snapshot = { link: SavedLink; index: number };

// Filing a link out of this list refetches it without that link, which would
// unmount the row and its open Add to… popover. While the row is held (popover
// open) or leaving, the last copy seen stays in its place until it has gone.
export function useHeldRow(links: SavedLink[]): SavedLink[] {
  const heldId = useLinksUi((state) => state.heldId);
  const leavingIds = useLinksUi((state) => state.leavingIds);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const keepId = heldId ?? (snapshot && leavingIds.includes(snapshot.link.id) ? snapshot.link.id : null);

  const index = keepId === null ? -1 : links.findIndex((link) => link.id === keepId);
  const seen = links[index];
  if (keepId === null && snapshot !== null) setSnapshot(null);
  if (seen && (snapshot?.link !== seen || snapshot.index !== index)) setSnapshot({ link: seen, index });

  if (keepId === null || seen || snapshot?.link.id !== keepId) return links;
  return [...links.slice(0, snapshot.index), snapshot.link, ...links.slice(snapshot.index)];
}
