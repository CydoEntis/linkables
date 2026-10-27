import { UNGROUPED, type Group } from "@linkables/shared/groups";
import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { isNarrowed, type FiltersChange, type ListFilters } from "../search/list-filters";
import { NoMatches } from "../search/NoMatches";
import { LinkList } from "../links/LinkList";
import { useLinks, type ListScope } from "../links/use-links";
import { useCollectionsUi } from "./collections-ui-store";
import { RenameGroupForm, GroupMenu, SectionHeader } from "./GroupHeader";

type SectionsProps = {
  collectionId: string;
  // The collection's whole link count: the ungrouped section is what the groups leave of it.
  linkCount: number;
  groups: readonly Group[];
  filters: ListFilters;
  onFiltersChange: FiltersChange;
};

// Ungrouped links first, then each group in position order. While a search or
// filter is on, a section with no match disappears; if none matches, the usual no-matches message shows.
export function GroupSections({ collectionId, linkCount, groups, filters, onFiltersChange }: SectionsProps) {
  const ungroupedCount = Math.max(0, linkCount - groups.reduce((total, group) => total + group.linkCount, 0));
  const [hidden, setHidden] = useState<Readonly<Record<string, boolean>>>({});
  const report = useCallback((sectionId: string, isHidden: boolean) => {
    setHidden((current) => (current[sectionId] === isHidden ? current : { ...current, [sectionId]: isHidden }));
  }, []);
  const sectionIds = [...(ungroupedCount > 0 ? [ungroupedId(collectionId)] : []), ...groups.map((group) => group.id)];
  const noneMatch = isNarrowed(filters) && sectionIds.every((id) => hidden[id] === true);
  const common = { collectionId, filters, onFiltersChange, report };

  return (
    <div className="flex flex-col gap-3 md:gap-5">
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
  report: (sectionId: string, hidden: boolean) => void;
};

function UngroupedSection({ count, ...common }: CommonProps & { count: number }) {
  const sectionId = ungroupedId(common.collectionId);
  return (
    <Section
      {...common}
      sectionId={sectionId}
      scope={{ collectionId: common.collectionId, groupId: UNGROUPED }}
      title="Ungrouped"
      count={count}
      empty={null}
    />
  );
}

function GroupSection({ group, groups, ...common }: CommonProps & { group: Group; groups: readonly Group[] }) {
  const [renaming, setRenaming] = useState(false);
  return (
    <Section
      {...common}
      sectionId={group.id}
      scope={{ collectionId: common.collectionId, groupId: group.id }}
      title={group.name}
      count={group.linkCount}
      empty={<p className="px-3 py-3 text-sm text-muted-foreground md:px-3.5">No links yet. Move links here from the row menu.</p>}
      editor={renaming ? <RenameGroupForm collectionId={common.collectionId} group={group} onDone={() => { setRenaming(false); }} /> : undefined}
      menu={<GroupMenu collectionId={common.collectionId} group={group} groups={groups} onRename={() => { setRenaming(true); }} />}
    />
  );
}

type SectionProps = CommonProps & {
  sectionId: string;
  scope: ListScope;
  title: string;
  count: number;
  empty: ReactNode;
  editor?: ReactNode;
  menu?: ReactNode;
};

function Section({ sectionId, scope, title, count, empty, editor, menu, filters, onFiltersChange, report }: SectionProps) {
  const collapsed = useCollectionsUi((state) => sectionId in state.collapsed);
  const toggle = useCollectionsUi((state) => state.toggleCollapsed);
  const bodyId = useId();
  // Same query as the list under it, so this costs no extra request.
  const { query } = useLinks(scope, filters);
  const noMatch = isNarrowed(filters) && query.isSuccess && query.data.pages.every((page) => page.items.length === 0);

  useEffect(() => {
    report(sectionId, noMatch);
  }, [sectionId, noMatch, report]);

  if (noMatch) return null;
  return (
    <section aria-label={title}>
      <SectionHeader title={title} count={count} collapsed={collapsed} onToggle={() => { toggle(sectionId); }} bodyId={bodyId} editor={editor} menu={menu} />
      <div id={bodyId} hidden={collapsed}>
        {collapsed ? null : <LinkList scope={scope} filters={filters} onFiltersChange={onFiltersChange} section={{ empty }} />}
      </div>
    </section>
  );
}
