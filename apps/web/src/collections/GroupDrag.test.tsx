import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, createEvent, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { LINK_DRAG_TYPE } from "../links/LinkRow";
import { useLinksUi } from "../links/links-ui-store";
import { savedLink } from "../links/test-links";
import { linksKeys } from "../links/use-links";
import { TestRouter } from "../test/router";
import { resetViewport, stubViewport } from "../test/viewport";
import { CollectionList } from "./CollectionList";
import { useCollectionsUi } from "./collections-ui-store";
import { GROUP_DRAG_TYPE } from "./GroupDrop";
import { fakeGroupServer, filedLink, group } from "./test-groups";
import { useCollections } from "./use-collections";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const collectionId = crypto.randomUUID();
const reading = group("Reading", 0);
const later = group("Later", 1);
const inReading = filedLink("In reading", collectionId, reading.id);
const loose = filedLink("Loose link", collectionId, null);
const elsewhere = savedLink({ resource: { title: "Elsewhere link" } });

function Page() {
  const collection = useCollections().data?.[0];
  return collection ? <CollectionList collection={collection} filters={{}} onFiltersChange={vi.fn()} /> : null;
}

let client: QueryClient;

async function setup() {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const server = fakeGroupServer(collectionId, [{ ...reading }, { ...later }], [{ ...inReading }, { ...loose }], [elsewhere]);
  request.mockImplementation(server.request);
  render(
    <QueryClientProvider client={client}>
      <TestRouter>
        <Page />
      </TestRouter>
      <Toaster />
    </QueryClientProvider>,
  );
  await screen.findByRole("region", { name: "Later" });
  await screen.findByText("In reading");
  await screen.findByText("Loose link");
  return { server, user: userEvent.setup() };
}

const headerOf = (name: string) => within(screen.getByRole("region", { name })).getByRole("heading").parentElement as HTMLElement;

function transfer(types: string[], data = "") {
  return { types, getData: () => data, setData: vi.fn(), setDragImage: vi.fn(), dropEffect: "", effectAllowed: "" };
}

// fireEvent returns false when a handler cancelled the event, which is what lets a drop happen.
const dragOver = (target: HTMLElement, types: string[]) => !fireEvent(target, createEvent.dragOver(target, { dataTransfer: transfer(types) }));
const dropOn = (target: HTMLElement, types: string[], data: string) => {
  fireEvent(target, createEvent.dragOver(target, { dataTransfer: transfer(types, data) }));
  fireEvent(target, createEvent.drop(target, { dataTransfer: transfer(types, data) }));
};
const holdLink = (id: string) => { act(() => { useLinksUi.getState().setDraggingId(id); }); };

beforeEach(() => {
  request.mockReset();
  stubViewport(1280);
  useCollectionsUi.setState({ collapsed: {}, creatingGroupIn: null, groupedCollectionId: null });
  useLinksUi.getState().setDraggingId(null);
  toast.dismiss();
  return resetViewport;
});

describe("dragging a link onto a group header", () => {
  it("tints every header while a link is held and shows Move here on the one it is over", async () => {
    await setup();
    expect(headerOf("Later")).not.toHaveClass("outline-dashed");
    holdLink(loose.link.id);
    expect(headerOf("Later")).toHaveClass("outline-dashed");
    expect(headerOf("Ungrouped")).toHaveClass("outline-dashed");
    expect(screen.queryByTestId("drop-cue")).not.toBeInTheDocument();
    expect(dragOver(headerOf("Later"), [LINK_DRAG_TYPE])).toBe(true);
    expect(within(headerOf("Later")).getByTestId("drop-cue")).toHaveTextContent("Move here");
    expect(headerOf("Later")).not.toHaveClass("outline-dashed");
    fireEvent(headerOf("Later"), createEvent.dragLeave(headerOf("Later"), { relatedTarget: document.body }));
    expect(screen.queryByTestId("drop-cue")).not.toBeInTheDocument();
  });

  it("moves the link into the group it is dropped on and offers Undo", async () => {
    const { server } = await setup();
    holdLink(loose.link.id);
    dropOn(headerOf("Later"), [LINK_DRAG_TYPE], loose.link.id);
    await waitFor(() => { expect(server.calls).toContainEqual({ method: "PATCH", path: `/collections/${collectionId}/links/${loose.link.id}`, body: { groupId: later.id } }); });
    expect(useLinksUi.getState().draggingId).toBeNull();
    expect(await screen.findByText("Moved to Later")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => { expect(server.calls.filter((call) => call.method === "PATCH").at(-1)?.body).toEqual({ groupId: null }); });
  });

  it("moves a link to Ungrouped when dropped on that header", async () => {
    const { server } = await setup();
    holdLink(inReading.link.id);
    dropOn(headerOf("Ungrouped"), [LINK_DRAG_TYPE], inReading.link.id);
    await waitFor(() => { expect(server.calls).toContainEqual({ method: "PATCH", path: `/collections/${collectionId}/links/${inReading.link.id}`, body: { groupId: null } }); });
    expect(await screen.findByText("Moved to Ungrouped")).toBeInTheDocument();
  });

  it("says Already in over the link's own group and moves nothing when dropped there", async () => {
    const { server } = await setup();
    holdLink(inReading.link.id);
    dragOver(headerOf("Reading"), [LINK_DRAG_TYPE]);
    expect(within(headerOf("Reading")).getByTestId("drop-cue")).toHaveTextContent("Already in");
    dropOn(headerOf("Reading"), [LINK_DRAG_TYPE], inReading.link.id);
    expect(server.calls.some((call) => call.method === "PATCH")).toBe(false);
    expect(screen.queryByText(/^Moved to/)).not.toBeInTheDocument();
  });

  it("still takes a drop on the header of a collapsed group", async () => {
    const { server, user } = await setup();
    await user.click(within(headerOf("Later")).getByRole("button", { name: /^Later/ }));
    expect(within(screen.getByRole("region", { name: "Later" })).getByRole("button", { name: /^Later/ })).toHaveAttribute("aria-expanded", "false");
    holdLink(loose.link.id);
    dropOn(headerOf("Later"), [LINK_DRAG_TYPE], loose.link.id);
    await waitFor(() => { expect(server.calls.some((call) => call.method === "PATCH")).toBe(true); });
  });

  it("ignores a link that is not in this collection", async () => {
    await setup();
    client.setQueryData(linksKeys.list("all"), { pages: [{ items: [elsewhere], cursor: null }], pageParams: [undefined] });
    holdLink(elsewhere.id);
    expect(headerOf("Later")).not.toHaveClass("outline-dashed");
    expect(dragOver(headerOf("Later"), [LINK_DRAG_TYPE])).toBe(false);
  });
});

describe("dragging a group header", () => {
  const grip = (name: string) => within(screen.getByRole("region", { name })).getByTestId("group-grip");

  it("reorders the groups when one is dropped on another", async () => {
    const { server } = await setup();
    fireEvent(grip("Later"), createEvent.dragStart(grip("Later"), { dataTransfer: transfer([]) }));
    expect(headerOf("Reading")).toHaveClass("outline-dashed");
    expect(dragOver(headerOf("Reading"), [GROUP_DRAG_TYPE])).toBe(true);
    expect(within(headerOf("Reading")).getByTestId("drop-cue")).toHaveTextContent("Move here");
    dropOn(headerOf("Reading"), [GROUP_DRAG_TYPE], later.id);
    await waitFor(() => { expect(server.calls).toContainEqual({ method: "PUT", path: `/collections/${collectionId}/groups/order`, body: { ids: [later.id, reading.id] } }); });
    await waitFor(() => { expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([expect.stringMatching(/^Ungrouped/), expect.stringMatching(/^Later/), expect.stringMatching(/^Reading/)]); });
  });

  it("does not take a group onto itself or onto Ungrouped, nor a link onto a group drag", async () => {
    await setup();
    fireEvent(grip("Later"), createEvent.dragStart(grip("Later"), { dataTransfer: transfer([]) }));
    expect(dragOver(headerOf("Later"), [GROUP_DRAG_TYPE])).toBe(false);
    expect(dragOver(headerOf("Ungrouped"), [GROUP_DRAG_TYPE])).toBe(false);
    expect(dragOver(headerOf("Reading"), [LINK_DRAG_TYPE])).toBe(false);
  });

  it("does not take a group drag for a link", async () => {
    await setup();
    holdLink(loose.link.id);
    expect(dragOver(headerOf("Later"), [GROUP_DRAG_TYPE])).toBe(false);
  });
});
