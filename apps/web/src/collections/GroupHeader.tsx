import type { Group } from "@linkables/shared/groups";
import { ChevronDown, Ellipsis } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "cn";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DeleteGroupConfirm } from "./DeleteGroupConfirm";
import { linkCountLabel } from "./link-count";
import { useGroupNameForm } from "./use-group-name-form";
import { useDeleteGroup, useRenameGroup, useReorderGroups } from "./use-groups";

type SectionHeaderProps = {
  title: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  bodyId: string;
  // Replaces the title while a group is renamed in place.
  editor?: ReactNode;
  menu?: ReactNode;
};

// A section's heading is a button that folds it; the menu beside it manages a group.
export function SectionHeader({ title, count, collapsed, onToggle, bodyId, editor, menu }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-1 px-1 md:px-0">
      {editor ?? (
        <h2 className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={onToggle}
            className="-mx-1 flex h-11 max-w-full items-center gap-2 rounded-md px-2 text-left hover:bg-muted md:h-10"
          >
            <ChevronDown aria-hidden strokeWidth={2.4} className={cn("size-4 shrink-0 text-muted-foreground transition-transform", collapsed && "-rotate-90")} />
            <span className="truncate text-[15px] font-bold wrap-anywhere">{title}</span>
            <span className="shrink-0 text-[13px] font-medium text-muted-foreground">{linkCountLabel(count)}</span>
          </button>
        </h2>
      )}
      {menu}
    </div>
  );
}

type GroupMenuProps = { collectionId: string; group: Group; groups: readonly Group[]; onRename: () => void };

export function GroupMenu({ collectionId, group, groups, onRename }: GroupMenuProps) {
  const reorder = useReorderGroups(collectionId);
  const remove = useDeleteGroup(collectionId);
  const [confirming, setConfirming] = useState(false);
  const index = groups.findIndex((item) => item.id === group.id);

  function move(by: -1 | 1) {
    const ids = groups.map((item) => item.id);
    const [moved] = ids.splice(index, 1);
    if (moved !== undefined) ids.splice(index + by, 0, moved);
    reorder.mutate(ids);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Group options for ${group.name}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground data-popup-open:bg-muted md:size-10"
        >
          <Ellipsis aria-hidden className="size-[18px]" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRename}>Rename</DropdownMenuItem>
          <DropdownMenuItem disabled={index <= 0} onClick={() => { move(-1); }}>Move up</DropdownMenuItem>
          <DropdownMenuItem disabled={index === groups.length - 1} onClick={() => { move(1); }}>Move down</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={() => { setConfirming(true); }}>Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <DeleteGroupConfirm
        name={group.name}
        open={confirming}
        pending={remove.isPending}
        onOpenChange={setConfirming}
        onConfirm={() => { remove.mutate(group.id, { onSettled: () => { setConfirming(false); } }); }}
      />
    </>
  );
}

// Enter or leaving the field saves, Esc cancels, as renaming a collection does.
export function RenameGroupForm({ collectionId, group, onDone }: { collectionId: string; group: Group; onDone: () => void }) {
  const rename = useRenameGroup(collectionId, group.id);
  const { register, onSubmit, error } = useGroupNameForm({
    defaultName: group.name,
    save: async (name) => {
      if (name !== group.name) await rename.mutateAsync(name);
      onDone();
    },
  });
  const errorId = useId();
  const field = register("name");

  return (
    <form noValidate onSubmit={onSubmit} className="flex min-w-0 flex-1 flex-col gap-1 py-1">
      <input
        {...field}
        autoFocus
        autoComplete="off"
        aria-label="Group name"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onFocus={(event) => { event.currentTarget.select(); }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onDone();
          }
        }}
        onBlur={(event) => {
          void field.onBlur(event);
          if (!rename.isPending) onSubmit();
        }}
        className="h-10 w-full min-w-0 rounded-md bg-muted px-2 text-[15px] font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:outline-destructive"
      />
      {error ? (
        <p id={errorId} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
