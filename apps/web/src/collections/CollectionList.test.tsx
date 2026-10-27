import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Group } from "@linkables/shared/groups";
import type { ListFilters } from "../search/list-filters";
import { TestRouter } from "../test/router";
import { resetViewport, stubViewport } from "../test/viewport";
import { CollectionList } from "./CollectionList";
import { useCollectionsUi } from "./collections-ui-store";
import { listedCollection } from "./test-collections";
import { fakeGroupServer, filedLink, group } from "./test-groups";

const request = vi.hoisted(() => vi.fn<(path: string, schema: unknown, init?: RequestInit) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const collection = listedCollection({ name: "Rust", linkCount: 3 });

function setup({ groups, links = [], filters = {} }: { groups: Group[]; links?: ReturnType<typeof filedLink>[]; filters?: ListFilters }) {
  const server = fakeGroupServer(collection.id, groups, links);
  request.mockImplementation(server.request);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <TestRouter>
        <CollectionList collection={{ ...collection, linkCount: links.length }} filters={filters} onFiltersChange={vi.fn()} />
      </TestRouter>
    </QueryClientProvider>,
  );
  return { ...server, user: userEvent.setup() };
}

function sectionTitles() {
  return screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
}

async function openMenu(user: ReturnType<typeof userEvent.setup>, name: string, item: string) {
  await user.click(await screen.findByRole("button", { name: `Group options for ${name}` }));
  await user.click(await screen.findByRole("menuitem", { name: item }));
}

beforeEach(() => {
  request.mockReset();
  stubViewport(1280);
  useCollectionsUi.setState({ collapsed: {}, creatingGroupIn: null, groupedCollectionId: null });
});

afterEach(resetViewport);

describe("CollectionList", () => {
  it("looks like the plain list when the collection has no groups", async () => {
    setup({ groups: [], links: [filedLink("Plain link", collection.id, null)] });
    expect(await screen.findByRole("link", { name: /^Plain link/ })).toBeInTheDocument();
    expect(sectionTitles()).toEqual(["Today"]);
    expect(screen.queryByText("Ungrouped")).not.toBeInTheDocument();
  });

  it("shows ungrouped links first, then each group in order, without day headings", async () => {
    const [reading, tools] = [group("Reading", 0, 1), group("Tools", 1, 1)];
    setup({
      groups: [tools, reading],
      links: [filedLink("In tools", collection.id, tools.id), filedLink("Loose one", collection.id, null), filedLink("In reading", collection.id, reading.id)],
    });
    expect(await screen.findByRole("link", { name: /^Loose one/ })).toBeInTheDocument();
    expect(sectionTitles()).toEqual(["Ungrouped1 link", "Reading1 link", "Tools1 link"]);
    const reading_ = screen.getByRole("region", { name: "Reading" });
    expect(await within(reading_).findByRole("link", { name: /^In reading/ })).toBeInTheDocument();
  });

  it("hides the ungrouped section when every link is in a group", async () => {
    const reading = group("Reading", 0);
    setup({ groups: [reading], links: [filedLink("Only one", collection.id, reading.id)] });
    expect(await screen.findByRole("link", { name: /^Only one/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Ungrouped" })).not.toBeInTheDocument();
  });

  it("says an empty group has no links yet", async () => {
    setup({ groups: [group("Later", 0)] });
    expect(await screen.findByText("No links yet. Move links here from the row menu.")).toBeInTheDocument();
  });

  it("folds a section and opens it again", async () => {
    const reading = group("Reading", 0);
    const { user } = setup({ groups: [reading], links: [filedLink("Folded away", collection.id, reading.id)] });
    await screen.findByRole("link", { name: /^Folded away/ });
    const toggle = screen.getByRole("button", { name: /^Reading/ });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: /^Folded away/ })).not.toBeInTheDocument();
    await user.click(toggle);
    expect(await screen.findByRole("link", { name: /^Folded away/ })).toBeInTheDocument();
  });

  it("renames a group in place", async () => {
    const { user, calls } = setup({ groups: [group("Reading", 0)] });
    await openMenu(user, "Reading", "Rename");
    const field = await screen.findByRole("textbox", { name: "Group name" });
    await user.clear(field);
    await user.type(field, "To read{Enter}");
    expect(await screen.findByRole("button", { name: /^To read/ })).toBeInTheDocument();
    expect(calls.find((call) => call.method === "PATCH")?.body).toEqual({ name: "To read" });
  });

  it("keeps the rename field open with the reason when the name is taken", async () => {
    const { user } = setup({ groups: [group("Reading", 0), group("Tools", 1)] });
    await openMenu(user, "Tools", "Rename");
    const field = await screen.findByRole("textbox", { name: "Group name" });
    await user.clear(field);
    await user.type(field, "reading{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("You already have a group with that name");
  });

  it("deletes a group after a confirm and its links return to Ungrouped", async () => {
    const reading = group("Reading", 0);
    const { user, calls } = setup({ groups: [reading, group("Tools", 1)], links: [filedLink("Stays put", collection.id, reading.id)] });
    await screen.findByRole("link", { name: /^Stays put/ });
    await openMenu(user, "Reading", "Delete");
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Its links stay in the collection.");
    expect(calls.some((call) => call.method === "DELETE")).toBe(false);
    await user.click(within(dialog).getByRole("button", { name: "Delete group" }));
    await waitFor(() => { expect(screen.queryByRole("region", { name: "Reading" })).not.toBeInTheDocument(); });
    expect(calls.some((call) => call.method === "DELETE")).toBe(true);
    expect(await within(await screen.findByRole("region", { name: "Ungrouped" })).findByRole("link", { name: /^Stays put/ })).toBeInTheDocument();
  });

  it("moves a group down by sending the new order", async () => {
    const [first, second] = [group("Reading", 0), group("Tools", 1)];
    const { user, calls } = setup({ groups: [first, second] });
    await openMenu(user, "Reading", "Move down");
    await waitFor(() => { expect(sectionTitles()[0]).toMatch(/^Tools/); });
    expect(calls.find((call) => call.method === "PUT")?.body).toEqual({ ids: [second.id, first.id] });
  });

  it("cannot move the first group up or the last group down", async () => {
    const { user } = setup({ groups: [group("Reading", 0), group("Tools", 1)] });
    await user.click(await screen.findByRole("button", { name: "Group options for Reading" }));
    expect(await screen.findByRole("menuitem", { name: "Move up" })).toHaveAttribute("aria-disabled", "true");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Group options for Tools" }));
    expect(await screen.findByRole("menuitem", { name: "Move down" })).toHaveAttribute("aria-disabled", "true");
  });

  it("hides sections with no match while searching", async () => {
    const [reading, tools] = [group("Reading", 0), group("Tools", 1)];
    setup({
      groups: [reading, tools],
      links: [filedLink("Alpha post", collection.id, reading.id), filedLink("Beta tool", collection.id, tools.id)],
      filters: { q: "alpha" },
    });
    expect(await screen.findByRole("link", { name: /^Alpha post/ })).toBeInTheDocument();
    await waitFor(() => { expect(screen.queryByRole("region", { name: "Tools" })).not.toBeInTheDocument(); });
    expect(screen.getByRole("region", { name: "Reading" })).toBeInTheDocument();
  });

  it("says so when nothing matches in any section", async () => {
    setup({ groups: [group("Reading", 0)], links: [filedLink("Alpha post", collection.id, null)], filters: { q: "zzz" } });
    expect(await screen.findByText("No links match “zzz”")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Reading" })).not.toBeInTheDocument();
  });

  it("asks for each group's links with the groupId filter", async () => {
    const reading = group("Reading", 0);
    const { calls } = setup({ groups: [reading], links: [filedLink("Any", collection.id, null)] });
    await screen.findByRole("link", { name: /^Any/ });
    const paths = calls.map((call) => call.path);
    expect(paths).toContain(`/links?collectionId=${collection.id}&groupId=none`);
    expect(paths).toContain(`/links?collectionId=${collection.id}&groupId=${reading.id}`);
  });
});
