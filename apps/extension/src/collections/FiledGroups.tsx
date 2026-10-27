import { cn } from "cn";
import { useState } from "react";
import { Alert } from "../ui";
import { displayName } from "./picker";
import { useGroups, useMoveToGroup } from "./use-groups";
import type { CollectionRef } from "./use-collections";

type FiledGroupsProps = { linkId: string; filed: readonly CollectionRef[]; initial: readonly CollectionRef[] };

// A group picker for each collection the link is filed in that has groups. initial is
// what the link was in when this opened: its group there is not known, a fresh filing's is none.
export function FiledGroups({ linkId, filed, initial }: FiledGroupsProps) {
  const [wasIn] = useState(() => new Set(initial.map((collection) => collection.id)));
  return (
    <>
      {filed.map((collection) => (
        <GroupChoice key={collection.id} linkId={linkId} collection={collection} current={wasIn.has(collection.id) ? undefined : null} />
      ))}
    </>
  );
}

type GroupChoiceProps = { linkId: string; collection: CollectionRef; current: string | null | undefined };

function GroupChoice({ linkId, collection, current: initial }: GroupChoiceProps) {
  const groups = useGroups(collection.id);
  const move = useMoveToGroup(collection.id, linkId);
  const [current, setCurrent] = useState(initial);
  const [problem, setProblem] = useState(false);
  const items = groups.data ?? [];
  if (items.length === 0) return null;
  const name = displayName(collection.name);
  const options = [{ id: null, name: "Ungrouped" }, ...items];

  function choose(groupId: string | null) {
    if (groupId === current) return;
    const before = current;
    setProblem(false);
    setCurrent(groupId);
    move.mutate(groupId, {
      onError: () => {
        setCurrent(before);
        setProblem(true);
      },
    });
  }

  return (
    <div role="group" aria-label={`Group in ${name}`} className="flex flex-col gap-1.5 px-4 pb-3">
      <p className="px-0.5 text-[12px] font-semibold text-muted-foreground">
        Group in {name} <span className="font-normal text-subtle-foreground">· optional</span>
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <li key={option.id ?? "none"} className="max-w-full">
            <button
              type="button"
              aria-pressed={current === option.id}
              onClick={() => { choose(option.id); }}
              className={cn(
                "h-[30px] max-w-full truncate rounded-full px-3 text-[12.5px] font-semibold",
                current === option.id ? "bg-primary text-primary-foreground" : "bg-accent hover:bg-line-strong",
              )}
            >
              {option.name}
            </button>
          </li>
        ))}
      </ul>
      {problem ? <Alert>{`Couldn't move it in ${name}. Try again.`}</Alert> : null}
    </div>
  );
}
