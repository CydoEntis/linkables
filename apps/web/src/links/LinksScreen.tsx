import { useState, type ReactNode } from "react";
import { AddToSheet } from "../collections/AddToSheet";
import { BookmarkletDialog } from "../save/BookmarkletDialog";
import { CommandPalette } from "../search/CommandPalette";
import { FilterBar } from "../search/FilterBar";
import type { FiltersChange, ListFilters } from "../search/list-filters";
import { PhoneSearchField } from "../search/PhoneSearchField";
import { ShortcutSheet } from "../search/ShortcutSheet";
import { useListShortcuts } from "../search/use-list-shortcuts";
import { AppShell } from "../shell/AppShell";
import { LayoutToggle } from "./LayoutToggle";
import { LinkList } from "./LinkList";
import { SaveBar } from "./SaveBar";
import { SaveFab, SaveSheet } from "./SaveSheet";
import { SaveStatus } from "./SaveStatus";
import { effectiveScope, type ListScope } from "./use-links";
import { usePasteToSave } from "./use-paste-to-save";

type LinksScreenProps = {
  scope: ListScope;
  heading: ReactNode;
  // The search, sort and filters from the URL, and how to change them.
  filters: ListFilters;
  onFiltersChange: FiltersChange;
  // Replaces the plain list, for a collection that lays its links out in sections.
  list?: ReactNode;
};

// One list screen for the views and for a collection; only the heading differs.
export function LinksScreen({ scope, heading, filters, onFiltersChange, list }: LinksScreenProps) {
  usePasteToSave();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [bookmarkletOpen, setBookmarkletOpen] = useState(false);
  useListShortcuts({ onPalette: () => { setPaletteOpen((open) => !open); }, onHelp: () => { setShortcutsOpen(true); } });
  // Refining a search replaces its history entry; starting or ending one adds an entry, so Back returns to it.
  const onQueryChange = (q: string | undefined) => { onFiltersChange({ q }, { replace: q !== undefined && filters.q !== undefined }); };

  return (
    <AppShell scope={effectiveScope(scope, filters)} search={<PhoneSearchField query={filters.q} onQueryChange={onQueryChange} />}>
      <SaveBar className="hidden md:block" query={filters.q} onQueryChange={onQueryChange} />
      {heading}
      <FilterBar scope={scope} filters={filters} onFiltersChange={onFiltersChange} trailing={<LayoutToggle />} />
      {list ?? <LinkList scope={scope} filters={filters} onFiltersChange={onFiltersChange} />}
      <SaveStatus />
      <SaveFab />
      <SaveSheet />
      <AddToSheet />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onSearch={onQueryChange}
        onBookmarklet={() => { setBookmarkletOpen(true); }}
        onShortcuts={() => { setShortcutsOpen(true); }}
      />
      <ShortcutSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <BookmarkletDialog open={bookmarkletOpen} onOpenChange={setBookmarkletOpen} />
    </AppShell>
  );
}
