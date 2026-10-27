import type { Group } from "@linkables/shared/groups";
import type { SavedLink } from "@linkables/shared/links";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { useState } from "react";
import { cn } from "cn";
import { cachedGroupId, useMoveToGroup } from "./use-move-to-group";
import { useGroups } from "./use-groups";

type GroupPickerProps = { link: SavedLink; collectionId: string; size: "popover" | "sheet" };

// The Add to… picker's second part: which group of the collection on screen the link sits in.
export function GroupPicker({ link, collectionId, size }: GroupPickerProps) {
  const queryClient = useQueryClient();
  const groups = useGroups(collectionId);
  const move = useMoveToGroup();
  // Kept here from when the picker opened, like the collection ticks, since the row may leave the list behind it.
  const [currentId, setCurrentId] = useState<string | null>(() => cachedGroupId(queryClient, collectionId, link.id) ?? null);
  const sheet = size === "sheet";
  const options: (Pick<Group, "id" | "name"> | null)[] = [null, ...(groups.data ?? [])];

  function choose(target: Pick<Group, "id" | "name"> | null) {
    if ((target?.id ?? null) === currentId) return;
    const from = options.find((option) => (option?.id ?? null) === currentId) ?? null;
    move({ link, collectionId, from, to: target }, { onMoved: setCurrentId });
  }

  if ((groups.data ?? []).length === 0) return null;
  return (
    <div role="group" aria-label="Group" className="flex min-h-0 flex-col gap-0.5">
      <p className={cn("shrink-0 font-semibold text-muted-foreground", sheet ? "px-1 pt-1 text-[13px]" : "px-2 pt-2 text-xs")}>Group</p>
      <ul aria-label="Groups" className={cn("flex min-h-0 flex-col overflow-auto", sheet ? "-mx-1.5 max-h-48" : "max-h-40")}>
        {options.map((option) => {
          const chosen = (option?.id ?? null) === currentId;
          return (
            <li key={option?.id ?? "none"}>
              <button
                type="button"
                aria-pressed={chosen}
                onClick={() => { choose(option); }}
                className={cn(
                  "flex w-full items-center text-left",
                  sheet ? "min-h-[52px] gap-3 rounded-xl px-2.5 text-base" : "min-h-10 gap-2.5 rounded-[9px] px-2 text-sm hover:bg-muted",
                  sheet && chosen && "bg-[#232323]",
                )}
              >
                <span className={cn("min-w-0 flex-1 truncate", chosen && sheet && "font-bold")}>{option?.name ?? "Ungrouped"}</span>
                <span
                  aria-hidden
                  className={cn(
                    "flex shrink-0 items-center justify-center rounded-full text-primary-foreground",
                    sheet ? "size-6" : "size-5",
                    chosen ? "animate-tick bg-primary" : "bg-accent",
                  )}
                >
                  {chosen ? <Check strokeWidth={3} className={sheet ? "size-3.5" : "size-3"} /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
