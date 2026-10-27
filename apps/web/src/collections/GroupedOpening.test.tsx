import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLinksUi } from "../links/links-ui-store";
import { savedLink } from "../links/test-links";
import { useAskBeforeOpening } from "../open-links/confirm-setting";
import { useSelection } from "../open-links/selection-store";
import { useCollectionOpening } from "../open-links/use-collection-opening";
import { testQueryClient } from "../test/render-with-router";
import { TestRouter } from "../test/router";
import { resetViewport, stubViewport } from "../test/viewport";
import { CollectionList } from "./CollectionList";
import { useCollectionsUi } from "./collections-ui-store";
import { listedCollection } from "./test-collections";
import { fakeGroupServer, group } from "./test-groups";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const collection = listedCollection({ name: "Trip", linkCount: 3 });
const [first, second] = [group("First", 0), group("Second", 1)];

function filedAt(n: number, groupId: string | null) {
  const link = savedLink({
    collections: [{ id: collection.id, name: collection.name }],
    originalUrl: `https://site${String(n)}.example/`,
    resource: { title: `Link ${String(n)}` },
  });
  return { link, groupId };
}

function Page() {
  const opening = useCollectionOpening(collection, {});
  return (
    <>
      {opening.actions}
      {opening.extras}
      <CollectionList collection={collection} filters={{}} onFiltersChange={vi.fn()} />
    </>
  );
}

beforeEach(() => {
  request.mockReset();
  stubViewport(1280);
  useCollectionsUi.setState({ collapsed: {}, creatingGroupIn: null, groupedCollectionId: null });
  useAskBeforeOpening.setState({ ask: true });
  const server = fakeGroupServer(collection.id, [first, second], [filedAt(1, null), filedAt(2, first.id), filedAt(3, second.id)]);
  request.mockImplementation(server.request);
});

afterEach(() => {
  resetViewport();
  useSelection.setState({ selecting: false, chosen: {} });
  useLinksUi.setState({ deletingIds: [] });
});

async function renderPage() {
  render(
    <QueryClientProvider client={testQueryClient()}>
      <TestRouter>
        <Page />
      </TestRouter>
    </QueryClientProvider>,
  );
  await screen.findByText("Link 3");
  await waitFor(() => { expect(screen.getByRole("button", { name: "Open all" })).toBeEnabled(); });
}

describe("Open all and Select on a collection with groups", () => {
  it("ticks links across sections", async () => {
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    await userEvent.click(screen.getByRole("checkbox", { name: /^Link 1/ }));
    await userEvent.click(screen.getByRole("checkbox", { name: /^Link 3/ }));
    expect(screen.getByRole("button", { name: "Open 2" })).toBeInTheDocument();
  });

  it("selects the whole collection with Select all, even a folded section", async () => {
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: /^Second/ }));
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    await userEvent.click(screen.getByRole("button", { name: "Select all" }));
    expect(await screen.findByRole("button", { name: "Open 3" })).toBeInTheDocument();
  });

  it("Open all covers every section", async () => {
    await renderPage();
    await userEvent.click(screen.getByRole("button", { name: "Open all" }));
    expect(await screen.findByRole("dialog", { name: "Open 3 links?" })).toBeInTheDocument();
  });
});
