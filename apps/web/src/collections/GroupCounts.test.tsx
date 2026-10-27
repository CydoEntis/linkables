import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { useDeleteLink } from "../links/use-delete-link";
import { savedLink } from "../links/test-links";
import { TestRouter } from "../test/router";
import { resetViewport, stubViewport } from "../test/viewport";
import { CollectionList } from "./CollectionList";
import { useCollectionsUi } from "./collections-ui-store";
import { fakeGroupServer, filedLink, group } from "./test-groups";
import { useCollections } from "./use-collections";
import { useMembership } from "./use-membership";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const collectionId = crypto.randomUUID();
const ref = { id: collectionId, name: "Rust" };

// The page as the app has it: the collection comes from the collections query, whose count the membership hooks move.
function Page({ outside, inside }: { outside: ReturnType<typeof savedLink>; inside: ReturnType<typeof savedLink> }) {
  const collection = useCollections().data?.[0];
  const setFiled = useMembership();
  const deleteLink = useDeleteLink();
  return (
    <>
      <button type="button" onClick={() => { setFiled({ link: outside, collection: ref, filed: true }); }}>add outside</button>
      <button type="button" onClick={() => { setFiled({ link: inside, collection: ref, filed: false }); }}>remove inside</button>
      <button type="button" onClick={() => { deleteLink(inside.id); toast.dismiss(); }}>delete inside</button>
      {collection ? <CollectionList collection={collection} filters={{}} onFiltersChange={vi.fn()} /> : null}
    </>
  );
}

function setup() {
  const reading = group("Reading", 0);
  const grouped = filedLink("Grouped link", collectionId, reading.id);
  const outside = savedLink({ resource: { title: "Outside link" } });
  const server = fakeGroupServer(collectionId, [reading], [grouped], [outside]);
  request.mockImplementation(server.request);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <TestRouter>
        <Page outside={outside} inside={grouped.link} />
      </TestRouter>
      <Toaster />
    </QueryClientProvider>,
  );
  return { user: userEvent.setup() };
}

beforeEach(() => {
  request.mockReset();
  stubViewport(1280);
  useCollectionsUi.setState({ collapsed: {}, creatingGroupIn: null, groupedCollectionId: null });
  return resetViewport;
});

describe("group counts after changes made outside the group menus", () => {
  it("shows an Ungrouped section once a link is added to the collection from Add to…", async () => {
    const { user } = setup();
    await screen.findByRole("region", { name: "Reading" });
    expect(screen.queryByRole("region", { name: "Ungrouped" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "add outside" }));
    expect(await screen.findByRole("region", { name: "Ungrouped" })).toBeInTheDocument();
  });

  it("updates a group's count when its link is removed from the collection", async () => {
    const { user } = setup();
    const reading = await screen.findByRole("region", { name: "Reading" });
    expect(within(reading).getByText("1 link")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "remove inside" }));
    await waitFor(() => { expect(within(screen.getByRole("region", { name: "Reading" })).getByText("0 links")).toBeInTheDocument(); });
  });

  it("updates a group's count when its link is deleted", async () => {
    const { user } = setup();
    const reading = await screen.findByRole("region", { name: "Reading" });
    expect(within(reading).getByText("1 link")).toBeInTheDocument();
    await act(async () => { await user.click(screen.getByRole("button", { name: "delete inside" })); });
    await waitFor(() => { expect(within(screen.getByRole("region", { name: "Reading" })).getByText("0 links")).toBeInTheDocument(); });
  });
});
