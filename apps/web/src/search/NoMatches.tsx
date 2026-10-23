import { Button } from "@/components/ui/button";
import { CLEARED_FILTERS, hasFilters, type FiltersChange, type ListFilters } from "./list-filters";

// Nothing matches a search or filter: not the same as an empty list, so it says so and offers the way back.
export function NoMatches({ filters, onFiltersChange }: { filters: ListFilters; onFiltersChange: FiltersChange }) {
  const filtered = hasFilters(filters);
  return (
    <div className="flex animate-fade-in flex-col items-start gap-1.5 px-3 py-10 md:gap-2 md:px-3.5 md:py-14">
      <p className="text-[17px] font-bold wrap-anywhere md:text-xl">
        {filters.q === undefined ? "No links match these filters" : `No links match “${filters.q}”`}
      </p>
      <p className="text-sm text-muted-foreground md:text-[14.5px]">
        {filters.q === undefined ? "Remove a filter to see more." : filtered ? "Try fewer words or fewer filters." : "Try fewer words."}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {filters.q === undefined ? null : (
          <Button variant="ghost" size="touch" onClick={() => { onFiltersChange({ q: undefined }); }}>
            Clear search
          </Button>
        )}
        {filtered ? (
          <Button variant="ghost" size="touch" onClick={() => { onFiltersChange(CLEARED_FILTERS); }}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
