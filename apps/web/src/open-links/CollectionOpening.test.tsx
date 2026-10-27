import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import type { ListLinksResponse, SavedLink } from "@linkables/shared/links";
import type { InfiniteData } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import type { ListFilters } from "../search/list-filters";
import { useLinksUi } from "../links/links-ui-store";
import { linksKeys } from "../links/use-links";
import { LinkList } from "../links/LinkList";
import { savedLink } from "../links/test-links";
import { listedCollection } from "../collections/test-collections";
import { testQueryClient } from "../test/render-with-router";
import { TestRouter } from "../test/router";
import { resetViewport, stubViewport } from "../test/viewport";
import { useAskBeforeOpening } from "./confirm-setting";
import { useSelection } from "./selection-store";
import { useCollectionOpening } from "./use-collection-opening";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const COLLECTION = listedCollection({ name: "Trip", linkCount: 3 });

function link(n: number): SavedLink {
  return savedLink({ collections: [{ id: COLLECTION.id, name: COLLECTION.name }], originalUrl: `https://site${String(n)}.example/`, resource: { title: `Link ${String(n)}` } });
}

function serve(pages: SavedLink[][]) {
  request.mockImplementation((path) => {
    const cursor = new URLSearchParams(path.split("?")[1]).get("cursor");
    const index = cursor === null ? 0 : Number(cursor);
    return Promise.resolve({ items: pages[index] ?? [], cursor: index + 1 < pages.length ? String(index + 1) : null });
  });
}

function Page({ filters }: { filters: ListFilters }) {
  const opening = useCollectionOpening(COLLECTION, filters);
  return (
    <>
      {opening.actions}
      {opening.extras}
      <LinkList scope={{ collectionId: COLLECTION.id }} filters={filters} />
    </>
  );
}

const queryClient = testQueryClient();

function ui(filters: ListFilters) {
  return (
    <QueryClientProvider client={queryClient}>
      <TestRouter>
        <Page filters={filters} />
      </TestRouter>
      <Toaster />
    </QueryClientProvider>
  );
}

async function renderPage() {
  const view = render(ui({}));
  await screen.findByText("Link 1");
  await waitFor(() => { expect(screen.getByRole("button", { name: "Open all" })).toBeEnabled(); });
  return { changeFilters: (filters: ListFilters) => { view.rerender(ui(filters)); } };
}

type Tab = { opener: unknown; location: { href: string } };
let tabs: Tab[];
let open: MockInstance<typeof window.open>;

function opened(): string[] {
  return tabs.map((tab) => tab.location.href);
}

// The first `allowed` calls get a tab; later ones are blocked, as a browser does after one click.
function stubOpen(allowed = Infinity) {
  open.mockImplementation(() => {
    if (tabs.length >= allowed) return null;
    const tab: Tab = { opener: {}, location: { href: "about:blank" } };
    tabs.push(tab);
    return tab as unknown as Window;
  });
}

beforeEach(() => {
  queryClient.clear();
  toast.dismiss();
  request.mockReset();
  tabs = [];
  open = vi.spyOn(window, "open");
  stubOpen();
  stubViewport(1280);
  serve([[link(1), link(2), link(3)]]);
});

afterEach(() => {
  open.mockRestore();
  resetViewport();
  useAskBeforeOpening.setState({ ask: true });
  useSelection.setState({ selecting: false, chosen: {} });
  useLinksUi.setState({ deletingIds: [] });
  localStorage.clear();
});

describe("Open all on a collection", () => {
  it("asks first, then opens every saved link in a new tab", async () => {
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    expect(open).not.toHaveBeenCalled();
    const dialog = screen.getByRole("dialog", { name: "Open 3 links?" });
    expect(dialog).toHaveTextContent("They'll open in new tabs.");

    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(opened()).toEqual(["https://site1.example/", "https://site2.example/", "https://site3.example/"]);
  });

  it("opens nothing when the confirm is cancelled", async () => {
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(open).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stops asking after Don't ask me again, and opens at once next time", async () => {
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Don't ask me again" }));
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(useAskBeforeOpening.getState().ask).toBe(false);

    tabs.length = 0;
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opened()).toHaveLength(3);
  });

  it("opens the links on pages that are not loaded yet", async () => {
    serve([[link(1), link(2)], [link(3)]]);
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    await userEvent.click(await screen.findByRole("button", { name: "Open" }));
    expect(opened()).toEqual(["https://site1.example/", "https://site2.example/", "https://site3.example/"]);
  });

  it("offers to open the links the browser blocked", async () => {
    stubOpen(1);
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(screen.getByText("Your browser blocked 2 of the 3 links")).toBeInTheDocument();

    stubOpen();
    tabs.length = 0;
    await userEvent.click(screen.getByRole("button", { name: "Open the other 2" }));

    expect(opened()).toEqual(["https://site2.example/", "https://site3.example/"]);
    expect(screen.queryByText(/Your browser blocked/)).not.toBeInTheDocument();
  });

  it("always asks above 25 links, even with asking turned off, and says so", async () => {
    useAskBeforeOpening.setState({ ask: false });
    serve([Array.from({ length: 26 }, (_, index) => link(index + 1))]);
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    const dialog = screen.getByRole("dialog", { name: "Open 26 links?" });
    expect(dialog).toHaveTextContent("your browser may block some of them");
    expect(dialog).toHaveTextContent("always asks above 25 links");
    expect(screen.queryByRole("checkbox", { name: "Don't ask me again" })).not.toBeInTheDocument();
  });
});

describe("Select to open", () => {
  async function startSelecting() {
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
  }

  it("selects a row instead of opening it", async () => {
    await startSelecting();
    const row = screen.getByRole("checkbox", { name: /Link 2/ });
    expect(row).toHaveAttribute("aria-checked", "false");

    await userEvent.click(row);

    expect(row).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });

  it("toggles a row with the space bar", async () => {
    await startSelecting();
    const row = screen.getByRole("checkbox", { name: /Link 1/ });
    row.focus();
    await userEvent.keyboard(" ");
    expect(row).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard(" ");
    expect(row).toHaveAttribute("aria-checked", "false");
  });

  it("hides the hover actions while choosing", async () => {
    await renderPage();
    const before = screen.getAllByRole("button", { name: "Pin" }).length;
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    // The phone's swipe tiles stay; only the hover group goes.
    expect(screen.getAllByRole("button", { name: "Pin" })).toHaveLength(before - 3);
  });

  it("selects every link in the collection with Select all", async () => {
    await startSelecting();
    await userEvent.click(screen.getByRole("button", { name: "Select all" }));
    await waitFor(() => { expect(screen.getByText("3 selected")).toBeInTheDocument(); });
  });

  it("opens only the selected links after the confirm, then clears the selection", async () => {
    await startSelecting();
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 1/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 3/ }));

    await userEvent.click(screen.getByRole("button", { name: "Open 2" }));
    expect(screen.getByRole("dialog", { name: "Open 2 links?" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(opened()).toEqual(["https://site1.example/", "https://site3.example/"]);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(useSelection.getState().chosen).toEqual({});
    expect(screen.queryByRole("checkbox", { name: /Link 1/ })).not.toBeInTheDocument();
  });

  it("opens a single selected link without asking", async () => {
    await startSelecting();
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 2/ }));
    await userEvent.click(screen.getByRole("button", { name: "Open 1" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opened()).toEqual(["https://site2.example/"]);
  });

  it("cancels with the Cancel button and with Escape", async () => {
    await startSelecting();
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 1/ }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.getByText("0 selected")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("toggles with Space, and Enter does not follow the link", async () => {
    await startSelecting();
    const row = screen.getByRole("checkbox", { name: /Link 1/ });
    row.focus();
    await userEvent.keyboard("{Enter}");
    expect(row).toHaveAttribute("aria-checked", "false");
    expect(open).not.toHaveBeenCalled();
    await userEvent.keyboard(" ");
    expect(row).toHaveAttribute("aria-checked", "true");
  });

  it("ends the selection when the search changes", async () => {
    const { changeFilters } = await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 1/ }));
    changeFilters({ q: "link" });
    await waitFor(() => { expect(screen.queryByRole("toolbar")).not.toBeInTheDocument(); });
    expect(useSelection.getState().chosen).toEqual({});
  });

  it("ends the selection when the sort changes", async () => {
    const { changeFilters } = await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 1/ }));
    changeFilters({ sort: "oldest" });
    await waitFor(() => { expect(screen.queryByRole("toolbar")).not.toBeInTheDocument(); });
  });

  it("drops a ticked link that is deleted", async () => {
    await startSelecting();
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 1/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 2/ }));
    const [first] = Object.keys(useSelection.getState().chosen);
    act(() => { useLinksUi.getState().startDeleting(first ?? ""); });
    await waitFor(() => { expect(screen.getByText("1 selected")).toBeInTheDocument(); });
  });

  it("drops a ticked link that is filed out of the collection", async () => {
    await startSelecting();
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 1/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /Link 3/ }));
    act(() => {
      queryClient.setQueryData<InfiniteData<ListLinksResponse>>(linksKeys.collection(COLLECTION.id), (data) => {
        const [first, ...rest] = data?.pages[0]?.items ?? [];
        return data && first && { ...data, pages: [{ items: [{ ...first, collections: [] }, ...rest], cursor: null }] };
      });
    });
    await waitFor(() => { expect(screen.getByText("1 selected")).toBeInTheDocument(); });
  });

  it("shows loading and disables Select all while it pages through the collection", async () => {
    let release: () => void = () => undefined;
    request.mockImplementation((path) => {
      const cursor = new URLSearchParams(path.split("?")[1]).get("cursor");
      if (cursor === null) return Promise.resolve({ items: [link(1), link(2)], cursor: "1" });
      return new Promise((resolve) => { release = () => { resolve({ items: [link(3)], cursor: null }); }; });
    });
    await startSelecting();
    await userEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(screen.queryByRole("button", { name: "Select all" })).not.toBeInTheDocument();
    await act(async () => { release(); await Promise.resolve(); });
    await waitFor(() => { expect(screen.getByText("3 selected")).toBeInTheDocument(); });
  });
});

describe("Open all while the collection loads", () => {
  it("shows Loading… on the button until every page is in", async () => {
    let release: () => void = () => undefined;
    request.mockImplementation((path) => {
      const cursor = new URLSearchParams(path.split("?")[1]).get("cursor");
      if (cursor === null) return Promise.resolve({ items: [link(1), link(2)], cursor: "1" });
      return new Promise((resolve) => { release = () => { resolve({ items: [link(3)], cursor: null }); }; });
    });
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    expect(screen.queryByRole("button", { name: "Open all" })).not.toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: "Loading…" })) expect(button).toBeDisabled();
    await act(async () => { release(); await Promise.resolve(); });
    expect(await screen.findByRole("dialog", { name: "Open 3 links?" })).toBeInTheDocument();
  });
});

describe("links that are not web addresses", () => {
  it("counts only the openable ones and says how many were skipped", async () => {
    const bad = savedLink({ collections: [{ id: COLLECTION.id, name: COLLECTION.name }], originalUrl: "javascript:alert(1)", resource: { title: "Link 3" } });
    serve([[link(1), link(2), bad]]);
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    expect(await screen.findByRole("dialog", { name: "Open 2 links?" })).toBeInTheDocument();
    expect(await screen.findByText("1 link skipped: not a web address")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(opened()).toHaveLength(2);
  });
});
