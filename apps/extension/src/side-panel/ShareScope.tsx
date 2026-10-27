import { Check } from "lucide-react";
import { cn } from "cn";
import { Alert } from "../ui";
import { scopeSummary, withGroupShared, withUngroupedShared } from "./share-scope";
import { useChangeShareScope, useShareScope } from "./use-share-scope";

// What a viewer of the link sees: the ungrouped links and each group, one tick apiece.
// Only a collection with groups has this, and it works while the link is off.
export function ShareScope({ collectionId }: { collectionId: string }) {
  const { data } = useShareScope(collectionId);
  const { change, problem } = useChangeShareScope(collectionId);
  const groups = data?.groups;
  if (data === undefined || groups === undefined || groups.length === 0) return null;

  return (
    <section aria-label="What's shared" className="flex flex-col gap-1">
      <h3 className="text-[12px] font-semibold text-muted-foreground">What&apos;s shared</h3>
      <p aria-live="polite" className="text-[12.5px] text-muted-foreground">{scopeSummary(groups)}</p>
      <ul className="-mx-1.5 flex max-h-[30vh] flex-col overflow-auto">
        <li>
          <Tick label="Ungrouped links" checked={data.ungrouped ?? true} onChange={(checked) => { change((current) => withUngroupedShared(current, checked)); }} />
        </li>
        {groups.map((group) => (
          <li key={group.id}>
            <Tick label={group.name} checked={group.shared} onChange={(checked) => { change((current) => withGroupShared(current, group.id, checked)); }} />
          </li>
        ))}
      </ul>
      {problem ? <Alert>Couldn&apos;t change what&apos;s shared. Try again.</Alert> : null}
    </section>
  );
}

type TickProps = { label: string; checked: boolean; onChange: (checked: boolean) => void };

function Tick({ label, checked, onChange }: TickProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => { onChange(!checked); }}
      className="flex min-h-10 w-full items-center gap-2.5 rounded-[10px] px-1.5 text-left text-[13.5px] hover:bg-muted"
    >
      <span
        aria-hidden
        className={cn("flex size-5 shrink-0 items-center justify-center rounded-md text-primary-foreground", checked ? "bg-primary" : "bg-accent")}
      >
        {checked ? <Check strokeWidth={3} className="size-3" /> : null}
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
}
