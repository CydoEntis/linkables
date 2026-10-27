import type { ShareGroup } from "@linkables/shared/sharing";
import { DropdownMenuCheckboxItem, DropdownMenuGroup, DropdownMenuGroupLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useChangeShareScope, useShareScope } from "./use-share-scope";

function summary(groups: readonly ShareGroup[]): string {
  const shared = groups.filter((group) => group.shared).length;
  return `${String(shared)} of ${String(groups.length)} ${groups.length === 1 ? "group" : "groups"} shared`;
}

// What a viewer of the link sees: the ungrouped links and each group, one tick apiece. Only a collection with groups has this.
export function ShareScope({ collectionId }: { collectionId: string }) {
  const { data } = useShareScope(collectionId);
  const change = useChangeShareScope(collectionId);
  const groups = data?.groups;
  if (groups === undefined || groups.length === 0) return null;

  return (
    <>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuGroupLabel>What&apos;s shared</DropdownMenuGroupLabel>
        <p aria-live="polite" className="px-2.5 pb-1 text-[12.5px] text-muted-foreground">{summary(groups)}</p>
        <div className="max-h-[40vh] overflow-y-auto">
          <DropdownMenuCheckboxItem checked={data?.ungrouped ?? true} onCheckedChange={(checked) => { change((current) => ({ ...current, ungrouped: checked })); }}>
            Ungrouped links
          </DropdownMenuCheckboxItem>
          {groups.map((group) => (
            <DropdownMenuCheckboxItem
              key={group.id}
              checked={group.shared}
              onCheckedChange={(checked) => {
                change((current) => ({ ...current, groups: current.groups?.map((item) => (item.id === group.id ? { ...item, shared: checked } : item)) }));
              }}
            >
              <span className="truncate">{group.name}</span>
            </DropdownMenuCheckboxItem>
          ))}
        </div>
      </DropdownMenuGroup>
    </>
  );
}
