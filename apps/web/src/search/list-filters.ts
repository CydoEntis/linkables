import { LINK_SORTS, RESOURCE_KINDS, SEARCH_QUERY_MAX_LENGTH, type LinkSort, type ResourceKind } from "@linkables/shared/links";
import { z } from "zod";

export const SORT_LABELS: Record<LinkSort, string> = { newest: "Newest", oldest: "Oldest", title: "Title A–Z" };

export const KIND_LABELS: Record<ResourceKind, string> = { video: "Videos", page: "Pages", other: "Other" };

// The router parses ?q=123 as a number, so a numeric search is turned back into text.
const searchText = z.preprocess(
  (value) => (typeof value === "number" ? String(value) : value),
  z
    .string()
    .trim()
    .max(SEARCH_QUERY_MAX_LENGTH)
    .refine((q) => !/\p{Cc}/u.test(q.replaceAll("\t", "")))
    .transform((q) => q || undefined),
);

// Dates in the URL are the user's local days, so a shared link reads as the
// days they picked; the request turns them into offset datetimes.
const localDay = z.iso.date();

// Every param falls back on its own, so one stale or hand-edited value never costs the rest.
export const listFiltersShape = {
  q: searchText.optional().catch(undefined),
  sort: z.enum(LINK_SORTS).optional().catch(undefined),
  kind: z.enum(RESOURCE_KINDS).optional().catch(undefined),
  pinned: z.literal(true).optional().catch(undefined),
  from: localDay.optional().catch(undefined),
  to: localDay.optional().catch(undefined),
};

// A reversed range is read the way it was meant, instead of as an empty list.
export function orderRange<T extends { from?: string | undefined; to?: string | undefined }>(filters: T): T {
  const { from, to } = filters;
  return from !== undefined && to !== undefined && from > to ? { ...filters, from: to, to: from } : filters;
}

export const listFiltersSchema = z.object(listFiltersShape).transform(orderRange);

// collection narrows a view to one collection; a collection's own page has no use for it.
export type ListFilters = z.output<typeof listFiltersSchema> & { collection?: string | undefined };

export type FiltersPatch = Partial<{ [Key in keyof ListFilters]: ListFilters[Key] | undefined }>;

export type FiltersChange = (patch: FiltersPatch, options?: { replace?: boolean }) => void;

export const CLEARED_FILTERS = { kind: undefined, pinned: undefined, from: undefined, to: undefined, collection: undefined } satisfies FiltersPatch;

export function hasFilters(filters: ListFilters): boolean {
  return Object.keys(CLEARED_FILTERS).some((key) => filters[key as keyof typeof CLEARED_FILTERS] !== undefined);
}

// Whether the list is narrowed in any way: a search or a filter. Sort only reorders.
export function isNarrowed(filters: ListFilters): boolean {
  return filters.q !== undefined || hasFilters(filters);
}

export type FilterChip = { key: string; label: string; clear: FiltersPatch };

// "Oct 1" this year, "Oct 1, 2025" in any other, like the rows' dates.
export function dayLabel(day: string): string {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  const sameYear = year === new Date().getFullYear();
  return new Date(year, month - 1, date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
}

function rangeLabel(from: string | undefined, to: string | undefined): string | null {
  if (from !== undefined && to !== undefined) return from === to ? dayLabel(from) : `${dayLabel(from)} – ${dayLabel(to)}`;
  if (from !== undefined) return `Since ${dayLabel(from)}`;
  if (to !== undefined) return `Until ${dayLabel(to)}`;
  return null;
}

// One removable chip per active filter, in the order the filter panel lists them.
export function filterChips(filters: ListFilters, collectionName: (id: string) => string | undefined): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.kind !== undefined) chips.push({ key: "kind", label: KIND_LABELS[filters.kind], clear: { kind: undefined } });
  if (filters.pinned) chips.push({ key: "pinned", label: "Pinned", clear: { pinned: undefined } });
  const range = rangeLabel(filters.from, filters.to);
  if (range !== null) chips.push({ key: "range", label: range, clear: { from: undefined, to: undefined } });
  if (filters.collection !== undefined) {
    const name = collectionName(filters.collection);
    chips.push({ key: "collection", label: name === undefined ? "In a collection" : `In ${name}`, clear: { collection: undefined } });
  }
  return chips;
}
