import type { ListLinksResponse } from "@linkables/shared/links";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@linkables/shared/api-client";
import { useCollectionsUi } from "../collections/collections-ui-store";
import type { ListFilters } from "../search/list-filters";
import { TestRouter } from "../test/router";
import { resetViewport, stubViewport } from "../test/viewport";
import { LinkList } from "./LinkList";
import { useLinksUi } from "./links-ui-store";
import type { LinksView } from "./links-search";
import { savedLink } from "./test-links";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

function page(titles: string[], cursor: string | null = null): ListLinksResponse {
  return { items: titles.map((title) => savedLink({ resource: { title } })), cursor };
}

function renderList(view: LinksView = "all", filters: ListFilters = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onFiltersChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <TestRouter>
        <LinkList scope={{ view }} filters={filters} onFiltersChange={onFiltersChange} />
      </TestRouter>
    </QueryClientProvider>,
  );
  return { onFiltersChange };
}

function requestedParams(): Record<string, string> {
  const [path] = request.mock.calls[0] ?? [""];
  return Object.fromEntries(new URLSearchParams(path.split("?")[1]));
}

beforeEach(() => {
  request.mockReset();
});

afterEach(resetViewport);

describe("LinkList", () => {
  it("groups links under day headings with pinned links first", async () => {
    request.mockResolvedValue({
      items: [savedLink({ resource: { title: "Fresh" } }), savedLink({ pinned: true, resource: { title: "Kept" } })],
      cursor: null,
    });
    renderList();
    expect(await screen.findByRole("heading", { name: "Pinned" })).toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["Pinned", "Today"]);
  });

  it("gives focus back to the row of the link whose page was just left, once", async () => {
    const back = savedLink({ resource: { title: "Read just now" } });
    request.mockResolvedValue({ items: [savedLink({ resource: { title: "Other" } }), back], cursor: null });
    useLinksUi.setState({ returnFocusId: back.id });
    renderList();
    await waitFor(() => { expect(screen.getByRole("link", { name: /^Read just now/ })).toHaveFocus(); });
    expect(useLinksUi.getState().returnFocusId).toBeNull();
  });

  it("gives focus to the next row when the link was deleted on its page", async () => {
    const deleted = savedLink({ resource: { title: "Deleted there" } });
    request.mockResolvedValue({ items: [deleted, savedLink({ resource: { title: "Next one" } })], cursor: null });
    useLinksUi.setState({ returnFocusId: deleted.id, deletingIds: [deleted.id] });
    renderList();
    await waitFor(() => { expect(screen.getByRole("link", { name: /^Next one/ })).toHaveFocus(); });
    useLinksUi.setState({ deletingIds: [] });
  });

  it("asks the API for the New view as view=inbox", async () => {
    request.mockResolvedValue(page([]));
    renderList("inbox");
    await screen.findByText("All sorted");
    expect(request).toHaveBeenCalledWith("/links?view=inbox", expect.anything(), expect.anything());
  });

  it("teaches a new user how to save", async () => {
    request.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByRole("heading", { name: /Save your first link/ })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual([
      "Paste a link",
      "Share from your phone",
      "Chrome extension",
    ]);
  });

  it("restarts from the first page when the API rejects the cursor", async () => {
    request
      .mockResolvedValueOnce(page(["First"], "cursor-1"))
      .mockRejectedValueOnce(new ApiError("VALIDATION", "Cursor is no longer valid"))
      .mockResolvedValueOnce(page(["First again"]));
    renderList();
    await userEvent.click(await screen.findByRole("button", { name: "Load more" }));
    expect(await screen.findByText("First again")).toBeInTheDocument();
    expect(request.mock.calls.map(([path]) => path)).toEqual(["/links", "/links?cursor=cursor-1", "/links"]);
  });

  it("leaves a collection that is being deleted out of each row, even after a refetch", async () => {
    const japan = { id: crypto.randomUUID(), name: "Japan" };
    request.mockResolvedValue({ items: [savedLink({ originalUrl: "https://example.com/a", collections: [japan] })], cursor: null });
    useCollectionsUi.getState().startDeleting(japan.id, { name: japan.name, undo: () => undefined });
    renderList();
    expect(await screen.findByRole("img", { name: "Not in a collection" })).toBeInTheDocument();
    useCollectionsUi.getState().stopDeleting(japan.id);
    expect(await screen.findByText(/^example.com/)).toHaveTextContent("example.com · in Japan");
  });

  it("searches every link from New, leaving the view out", async () => {
    request.mockResolvedValue(page([]));
    renderList("inbox", { q: "rust" });
    await screen.findByText("No links match “rust”");
    expect(request).toHaveBeenCalledWith("/links?q=rust", expect.anything(), expect.anything());
  });

  it("sends the sort and filters, with dates as the local day's first and last instants", async () => {
    const collection = crypto.randomUUID();
    request.mockResolvedValue(page([]));
    renderList("all", { sort: "title", kind: "video", pinned: true, from: "2026-10-01", to: "2026-10-20", collection });
    await screen.findByText("No links match these filters");
    const params = requestedParams();
    expect(params).toMatchObject({ sort: "title", kind: "video", pinned: "true", collectionId: collection });
    expect(Date.parse(params.from ?? "")).toBe(new Date(2026, 9, 1).getTime());
    expect(Date.parse(params.to ?? "")).toBe(new Date(2026, 9, 20, 23, 59, 59, 999).getTime());
  });

  it("tells no matches apart from an empty list and offers to clear the search", async () => {
    request.mockResolvedValue(page([]));
    const { onFiltersChange } = renderList("all", { q: "zebra" });
    expect(await screen.findByText("No links match “zebra”")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Save your first link/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onFiltersChange).toHaveBeenCalledWith({ q: undefined });
  });

  it("lists results in one list with a count, without day headings", async () => {
    request.mockResolvedValue({
      items: [savedLink({ resource: { title: "Rust by Example" } }), savedLink({ pinned: true, resource: { title: "Rust book" } })],
      cursor: null,
    });
    renderList("all", { q: "rust" });
    expect(await screen.findByText("2 matches")).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(screen.getAllByText("Rust", { selector: "mark" })).toHaveLength(2);
  });

  it("says when there are more matches than loaded", async () => {
    request.mockResolvedValue(page(["Rust"], "cursor-1"));
    renderList("all", { q: "rust" });
    expect(await screen.findByText("1+ matches")).toBeInTheDocument();
  });

  it("lays the links out as cards in one grid on a big screen", async () => {
    stubViewport(1920);
    request.mockResolvedValue({
      items: [savedLink({ resource: { title: "Fresh" } }), savedLink({ pinned: true, resource: { title: "Kept" } })],
      cursor: null,
    });
    renderList();
    const grid = await screen.findByRole("list", { name: "Links" });
    const [first, second] = within(grid).getAllByRole("link", { name: /^(Kept|Fresh)/ });
    expect(first).toHaveAccessibleName(/^Kept/);
    expect(second).toHaveAccessibleName(/^Fresh/);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("keeps a sorted list flat, in the API's order", async () => {
    request.mockResolvedValue(page(["Alpha", "Beta"]));
    renderList("all", { sort: "title" });
    await screen.findByText("Alpha");
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    expect(request).toHaveBeenCalledWith("/links?sort=title", expect.anything(), expect.anything());
  });

  it("announces the count from one status region, also when nothing matches", async () => {
    request.mockImplementation((path) => Promise.resolve(path.includes("zebra") ? page([]) : page(["Rust"])));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const list = (q: string) => (
      <QueryClientProvider client={queryClient}>
        <TestRouter>
          <LinkList scope={{ view: "all" }} filters={{ q }} />
        </TestRouter>
      </QueryClientProvider>
    );
    const { rerender } = render(list("rust"));
    const status = await screen.findByText("1 match");
    rerender(list("zebra"));
    await screen.findByText("No links match “zebra”");
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent("0 matches");
  });
});
