import type { Group } from "@linkables/shared/groups";
import { useQueryClient } from "@tanstack/react-query";
import { Check, GripVertical, MoveDown } from "lucide-react";
import { useState, type DragEvent } from "react";
import { cn } from "cn";
import { LINK_DRAG_TYPE } from "../links/LinkRow";
import { useLinksUi } from "../links/links-ui-store";
import { findCachedLink } from "../links/use-links";
import { useGroups } from "./use-groups";
import { cachedGroupId, useMoveToGroup } from "./use-move-to-group";

// A different type from a link's, so a group header is never taken for a link and the other way round.
export const GROUP_DRAG_TYPE = "application/x-linkables-group";

export type GroupDrag = { draggingId: string | null; setDraggingId: (id: string | null) => void; reorder: (fromId: string, toId: string) => void };

type Kind = "link" | "group";

// Each header takes dropped links (filed into its group, or ungrouped when group is null); a group's also takes another group, to reorder.
export function useHeaderDrop(collectionId: string, group: Group | null, groupDrag: GroupDrag) {
  const queryClient = useQueryClient();
  const groups = useGroups(collectionId).data ?? [];
  const move = useMoveToGroup();
  const draggingLinkId = useLinksUi((state) => state.draggingId);
  const [over, setOver] = useState<Kind | null>(null);

  const link = draggingLinkId === null ? undefined : findCachedLink(queryClient, draggingLinkId);
  // A link from another view is not this collection's to place.
  const linkFits = link?.collections.some((item) => item.id === collectionId) ?? false;
  const alreadyIn = linkFits && link !== undefined && (cachedGroupId(queryClient, collectionId, link.id) ?? null) === (group?.id ?? null);
  const groupFits = group !== null && groupDrag.draggingId !== null && groupDrag.draggingId !== group.id;
  const active = (linkFits && draggingLinkId !== null) || groupFits;

  function kindOf(event: DragEvent): Kind | null {
    const types = event.dataTransfer.types;
    if (types.includes(LINK_DRAG_TYPE) && linkFits) return "link";
    if (types.includes(GROUP_DRAG_TYPE) && groupFits) return "group";
    return null;
  }

  function onDragOver(event: DragEvent<HTMLElement>) {
    const kind = kindOf(event);
    if (kind === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = kind === "link" ? "copy" : "move";
    setOver(kind);
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    const kind = kindOf(event);
    setOver(null);
    if (kind === null) return;
    event.preventDefault();
    if (kind === "group") {
      if (group !== null) groupDrag.reorder(event.dataTransfer.getData(GROUP_DRAG_TYPE), group.id);
      return;
    }
    useLinksUi.getState().setDraggingId(null);
    if (link === undefined || alreadyIn) return;
    const fromId = cachedGroupId(queryClient, collectionId, link.id) ?? null;
    const from = groups.find((item) => item.id === fromId) ?? null;
    move({ link, collectionId, from, to: group });
  }

  const dropProps = {
    onDragOver,
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null);
    },
    onDrop,
  };
  const className = cn(
    "rounded-md transition-[background-color,box-shadow,outline-color] duration-200 ease-out-soft",
    // Outline, not border: the header keeps its size when a drag starts.
    active && over === null && "bg-primary-soft/40 outline-1 -outline-offset-1 outline-dashed outline-primary/50",
    over !== null && "bg-primary-soft shadow-[inset_0_0_0_1.5px_var(--primary),0_0_16px_-2px_var(--primary-soft)]",
  );
  const cue = over === null ? null : over === "link" && alreadyIn ? ("Already in" as const) : ("Move here" as const);
  return { dropProps, className, cue };
}

export function DropCue({ text }: { text: "Already in" | "Move here" }) {
  const Icon = text === "Already in" ? Check : MoveDown;
  return (
    <span data-testid="drop-cue" className="flex shrink-0 items-center gap-1 pr-2 text-xs font-semibold text-primary">
      <Icon aria-hidden strokeWidth={2.4} className="size-3.5" />
      {text}
    </span>
  );
}

// Mouse only: Move up and Move down in the group's menu are the way for everyone else.
export function GroupGrip({ group, groupDrag }: { group: Group; groupDrag: GroupDrag }) {
  return (
    <span
      aria-hidden
      draggable
      data-testid="group-grip"
      onDragStart={(event) => {
        event.dataTransfer.setData(GROUP_DRAG_TYPE, group.id);
        event.dataTransfer.effectAllowed = "move";
        const header = event.currentTarget.parentElement;
        if (header) event.dataTransfer.setDragImage(header, 16, 20);
        groupDrag.setDraggingId(group.id);
      }}
      onDragEnd={() => { groupDrag.setDraggingId(null); }}
      className="absolute top-1/2 -left-5 hidden size-5 -translate-y-1/2 cursor-grab items-center justify-center rounded text-subtle-foreground opacity-0 group-hover/header:opacity-100 group-focus-within/header:opacity-100 hover:text-foreground md:flex"
    >
      <GripVertical className="size-4" />
    </span>
  );
}
