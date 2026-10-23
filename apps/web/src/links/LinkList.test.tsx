import type { ListLinksResponse } from "@linkables/shared/links";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { LinkList } from "./LinkList";
import type { LinksView } from "./links-search";
import { savedLink } from "./test-links";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

function page(titles: string[], cursor: string | null = null): ListLinksResponse {
  return { items: titles.map((title) => savedLink({ resource: { title } })), cursor };
}

function renderList(view: LinksView = "all") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <LinkList scope={{ view }} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  request.mockReset();
});

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

  it("asks the API for the To sort view as view=inbox", async () => {
    request.mockResolvedValue(page([]));
    renderList("inbox");
    await screen.findByText("All sorted");
    expect(request).toHaveBeenCalledWith("/links?view=inbox", expect.anything(), expect.anything());
  });

  it("teaches a new user how to save", async () => {
    request.mockResolvedValue(page([]));
    renderList();
    expect(await screen.findByText("No links yet")).toBeInTheDocument();
    expect(screen.getByText(/Paste a link above/)).toBeInTheDocument();
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
});
