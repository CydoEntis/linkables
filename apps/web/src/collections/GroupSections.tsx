import { UNGROUPED, type Group } from "@linkables/shared/groups";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { isNarrowed, type FiltersChange, type ListFilters } from "../search/list-filters";
import { NoMatches } from "../search/NoMatches";
import { countLabel, LinkList, ResultCount } from "../links/LinkList";
import { useLinks, type ListScope } from "../links/use-links";
import { useCollectionsUi } from "./collections-ui-store";
import { GroupGrip, useHeaderDrop, type GroupDrag } from "./GroupDrop";
import { focusSectionHeading, GroupMenu, RenameGroupForm, SectionHeader } from "./GroupHeader";
import { useReorderGroups } from "./use-groups";

type SectionsProps = {
  collectionId: string;
  // The collection's whole link count: the ungrouped section is what the groups leave of it.
  linkCount: number;
  groups: readonly Group[];
  filters: ListFilters;
  onFiltersChange: FiltersChange;
};

// What one section's results look like so far; absent until its first page is in.
type Matches = { count: number; more: boolean; refreshing: boolean };

// Ungrouped links first, then each group in position order. While a search or
// filter is on, a section with no match disappears; if none matches, the usual no-matches message shows.
export function GroupSections({ collectionId, linkCount, groups, filters, onFiltersChange }: SectionsProps) {
  const ungroupedCount = Math.max(0, linkCount - groups.reduce((total, group) => total + group.linkCount, 0));
  const [matches, setMatches] = useState<Readonly<Record<string, Matches | undefined>>>({});
  const report = useCallback((sectionId: string, next: Matches | undefined) => {
    setMatches((current) => {
      const was = current[sectionId];
      const same = was === next || (was && next && was.count === next.count && was.more === next.more && was.refreshing === next.refreshing);
      return same ? current : { ...current, [sectionId]: next };
    });
  }, []);
  const sectionIds = [...(ungroupedCount > 0 ? [ungroupedId(collectionId)] : []), ...groups.map((group) => group.id)];
  const narrowed = isNarrowed(filters);
  const reported = sectionIds.map((id) => matches[id]);
  const noneMatch = narrowed && reported.every((match) => match !== undefined && match.count === 0);
  const [draggingGroupId, setDraggingGroupId] = useState<string | null>(null);
  const reorder = useReorderGroups(collectionId);
  const groupDrag: GroupDrag = {
    draggingId: draggingGroupId,
    setDraggingId: setDraggingGroupId,
    reorder: (fromId, toId) => {
      setDraggingGroupId(null);
      const ids = groups.map((group) => group.id);
      const from = ids.indexOf(fromId);
      const to = ids.indexOf(toId);
      if (from < 0 || to < 0 || from === to) return;
      ids.splice(to, 0, ...ids.splice(from, 1));
      reorder.mutate(ids);
    },
  };
  const common = { collectionId, filters, onFiltersChange, report, groupDrag };

  // One status region in every state, as the plain list has, so the total is announced as it changes.
  const total = reported.reduce((sum, match) => sum + (match?.count ?? 0), 0);
  const more = reported.some((match) => match?.more);
  const refreshing = reported.some((match) => match === undefined || match.refreshing);
  const status = narrowed ? countLabel(total, more, refreshing) : null;

  return (
    <div className="flex flex-col gap-3 md:gap-5">
      <ResultCount text={status} />
      {ungroupedCount > 0 ? <UngroupedSection {...common} count={ungroupedCount} /> : null}
      {groups.map((group) => (
        <GroupSection key={group.id} {...common} group={group} groups={groups} />
      ))}
      {noneMatch ? <NoMatches filters={filters} onFiltersChange={onFiltersChange} /> : null}
    </div>
  );
}

const ungroupedId = (collectionId: string) => `${collectionId}:${UNGROUPED}`;

type CommonProps = {
  collectionId: string;
  filters: ListFilters;
  onFiltersChange: FiltersChange;
  report: (sectionId: string, matches: Matches | undefined) => void;
  groupDrag: GroupDrag;
};

function UngroupedSection({ count, ...common }: CommonProps & { count: number }) {
  const sectionId = ungroupedId(common.collectionId);
  return (
    <Section
      {...common}
      sectionId={sectionId}
      scope={{ collectionId: common.collectionId, groupId: UNGROUPED }}
      group={null}
      title="Ungrouped"
      count={count}
      empty={null}
    />
  );
}

function GroupSection({ group, groups, ...common }: CommonProps & { group: Group; groups: readonly Group[] }) {
  const [renaming, setRenaming] = useState(false);
  // Leaving by Enter or Esc puts focus back on the heading; leaving by clicking elsewhere keeps where the click went.
  function doneRenaming(refocus: boolean) {
    setRenaming(false);
    if (refocus) requestAnimationFrame(() => { focusSectionHeading(group.id); });
  }
  return (
    <Section
      {...common}
      sectionId={group.id}
      scope={{ collectionId: common.collectionId, groupId: group.id }}
      group={group}
      title={group.name}
      count={group.linkCount}
      empty={<p className="px-3 py-3 text-sm text-muted-foreground md:px-3.5">No links yet. Move links here with Add to….</p>}
      editor={renaming ? <RenameGroupForm collectionId={common.collectionId} group={group} onDone={doneRenaming} /> : undefined}
      menu={<GroupMenu collectionId={common.collectionId} group={group} groups={groups} onRename={() => { setRenaming(true); }} />}
    />
  );
}

type SectionProps = CommonProps & {
  sectionId: string;
  scope: ListScope;
  group: Group | null;
  title: string;
  count: number;
  empty: ReactNode;
  editor?: ReactNode;
  menu?: ReactNode;
};

function Section({ sectionId, scope, group, title, count, empty, editor, menu, filters, onFiltersChange, report, collectionId, groupDrag }: SectionProps) {
  const drop = useHeaderDrop(collectionId, group, groupDrag);
  const collapsed = useCollectionsUi((state) => sectionId in state.collapsed);
  const toggle = useCollectionsUi((state) => state.toggleCollapsed);
  const bodyId = useId();
  // Same query as the list under it, so this costs no extra request.
  const { query } = useLinks(scope, filters);
  const loaded = query.data?.pages.flatMap((page) => page.items).length;
  const more = query.hasNextPage;
  const refreshing = query.isPlaceholderData;
  const noMatch = isNarrowed(filters) && loaded === 0;

  useEffect(() => {
    report(sectionId, loaded === undefined ? undefined : { count: loaded, more, refreshing });
  }, [report, sectionId, loaded, more, refreshing]);

  if (noMatch) return null;
  return (
    <section aria-label={title}>
      <SectionHeader sectionId={sectionId} title={title} count={count} collapsed={collapsed} onToggle={() => { toggle(sectionId); }} bodyId={bodyId} editor={editor} menu={menu} drop={drop} grip={group === null ? undefined : <GroupGrip group={group} groupDrag={groupDrag} />} />
      <div id={bodyId} hidden={collapsed}>
        {collapsed ? null : <LinkList scope={scope} filters={filters} onFiltersChange={onFiltersChange} section={{ empty }} />}
      </div>
    </section>
  );
}
