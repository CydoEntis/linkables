import type { ReactNode } from "react";
import { AddToSheet } from "../collections/AddToSheet";
import { FilterBar } from "../search/FilterBar";
import type { FiltersChange, ListFilters } from "../search/list-filters";
import { PhoneSearchField } from "../search/PhoneSearchField";
import { useSlashToFocus } from "../search/use-slash-to-focus";
import { AppShell } from "../shell/AppShell";
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
};

// One list screen for the views and for a collection; only the heading differs.
export function LinksScreen({ scope, heading, filters, onFiltersChange }: LinksScreenProps) {
  usePasteToSave();
  useSlashToFocus();
  // Refining a search replaces its history entry; starting or ending one adds an entry, so Back returns to it.
  const onQueryChange = (q: string | undefined) => { onFiltersChange({ q }, { replace: q !== undefined && filters.q !== undefined }); };

  return (
    <AppShell scope={effectiveScope(scope, filters)} search={<PhoneSearchField query={filters.q} onQueryChange={onQueryChange} />}>
      <SaveBar className="hidden md:block" query={filters.q} onQueryChange={onQueryChange} />
      {heading}
      <FilterBar scope={scope} filters={filters} onFiltersChange={onFiltersChange} />
      <LinkList scope={scope} filters={filters} onFiltersChange={onFiltersChange} />
      <SaveStatus />
      <SaveFab />
      <SaveSheet />
      <AddToSheet />
    </AppShell>
  );
}
