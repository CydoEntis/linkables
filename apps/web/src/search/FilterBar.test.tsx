import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listedCollection } from "../collections/test-collections";
import type { ListScope } from "../links/use-links";
import { FilterBar } from "./FilterBar";
import type { ListFilters } from "./list-filters";

const request = vi.hoisted(() => vi.fn<(path: string) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const rust = listedCollection({ name: "rust" });

function renderBar(filters: ListFilters, scope: ListScope = { view: "all" }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onFiltersChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <FilterBar scope={scope} filters={filters} onFiltersChange={onFiltersChange} />
    </QueryClientProvider>,
  );
  return { onFiltersChange, user: userEvent.setup() };
}

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ items: [rust] });
});

describe("FilterBar", () => {
  it("shows each active filter as a chip that removes it", async () => {
    const { onFiltersChange, user } = renderBar({ kind: "video", pinned: true, collection: rust.id });
    expect(await screen.findByRole("button", { name: "Remove filter: In Rust" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove filter: Videos" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ kind: undefined });
  });

  it("clears every filter, but not the search or sort, with Clear all", async () => {
    const { onFiltersChange, user } = renderBar({ q: "tokyo", sort: "title", kind: "video", from: "2026-10-01" });
    await user.click(screen.getByRole("button", { name: "Clear all" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ kind: undefined, pinned: undefined, from: undefined, to: undefined, collection: undefined });
  });

  it("shows no chips or Clear all when nothing is filtered", () => {
    renderBar({ q: "tokyo" });
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument();
  });

  it("sorts by title from the sort menu, and back to newest as the default", async () => {
    const { onFiltersChange, user } = renderBar({ sort: "title" });
    await user.click(screen.getByRole("button", { name: "Sort: Title A–Z" }));
    expect(await screen.findByRole("menuitemradio", { name: "Title A–Z" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("menuitemradio", { name: "Newest" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ sort: undefined });
  });

  it("filters by kind, pinned and collection from the filter panel", async () => {
    const { onFiltersChange, user } = renderBar({});
    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(screen.getByRole("radio", { name: "Videos" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ kind: "video" });
    await user.click(screen.getByRole("checkbox", { name: "Pinned only" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ pinned: true });
    await screen.findByRole("option", { name: "Rust" });
    await user.selectOptions(screen.getByRole("combobox", { name: "Collection" }), "Rust");
    expect(onFiltersChange).toHaveBeenCalledWith({ collection: rust.id });
  });

  it("holds back a reversed date range with a message", async () => {
    const { onFiltersChange, user } = renderBar({ from: "2026-10-20" });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    const to = screen.getByLabelText("To");
    await user.type(to, "2026-10-01");
    expect(screen.getByRole("alert")).toHaveTextContent("The first date is after the second.");
    expect(to).toHaveAttribute("aria-invalid", "true");
    expect(onFiltersChange).not.toHaveBeenCalled();
  });

  it("offers no pinned or collection filter where they cannot narrow the list", async () => {
    const { user } = renderBar({}, { view: "pinned" });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.queryByRole("checkbox", { name: "Pinned only" })).not.toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Collection" })).toBeInTheDocument();
  });

  it("offers no collection filter on a collection's page or on New", async () => {
    const { user } = renderBar({}, { view: "inbox" });
    await user.click(screen.getByRole("button", { name: "Filter" }));
    expect(screen.queryByRole("combobox", { name: "Collection" })).not.toBeInTheDocument();
  });
});
