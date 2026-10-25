import { ERROR_CODES } from "@linkables/shared/http";
import type { SavedLink } from "@linkables/shared/links";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { ApiError } from "@linkables/shared/api-client";
import { listedCollection } from "../collections/test-collections";
import { LinkRow } from "../links/LinkRow";
import { useLinksUi } from "../links/links-ui-store";
import { savedLink } from "../links/test-links";
import { linksKeys, updateCachedLink, type LinksPages } from "../links/use-links";
import { renderWithRouter, testQueryClient } from "../test/render-with-router";
import { LinkDetails } from "./LinkDetails";
import { NOTE_SAVE_DELAY_MS } from "./use-note-autosave";

type Request = (path: string, schema: unknown, init?: RequestInit) => Promise<unknown>;
const request = vi.hoisted(() => vi.fn<Request>());
vi.mock("../api/api", () => ({ api: { request } }));

const rust = listedCollection({ name: "rust" });

beforeEach(() => {
  request.mockReset();
  request.mockImplementation((path) => Promise.resolve(path === "/collections" ? { items: [rust] } : null));
  useLinksUi.setState({ deletingIds: [], leavingIds: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

async function renderDetails(link: SavedLink) {
  const queryClient = testQueryClient();
  queryClient.setQueryData<LinksPages>(linksKeys.list("all"), { pages: [{ items: [link], cursor: null }], pageParams: [undefined] });
  const rendered = await renderWithRouter(
    <>
      <LinkDetails />
      <Toaster />
    </>,
    { path: `/?link=${link.id}`, queryClient },
  );
  const cachedTitle = () => queryClient.getQueryData<LinksPages>(linksKeys.list("all"))?.pages[0]?.items[0];
  return { ...rendered, cachedTitle };
}

function patches() {
  return request.mock.calls.filter(([, , init]) => init?.method === "PATCH").map(([, , init]) => JSON.parse(init?.body as string) as unknown);
}

const details = () => screen.getByRole("dialog", { name: "Link details" });

function hidePage() {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  act(() => { document.dispatchEvent(new Event("visibilitychange")); });
  visibility.mockRestore();
}

function failPatches() {
  request.mockImplementation((path, _schema, init) =>
    init?.method === "PATCH" ? Promise.reject(new Error("offline")) : Promise.resolve(path === "/collections" ? { items: [] } : null),
  );
}

describe("link details", () => {
  it("shows the link, where it is filed, and the summary still to come", async () => {
    await renderDetails(savedLink({ originalUrl: "https://www.youtube.com/watch?v=1", savedFrom: "iphone", resource: { title: "Tokyo night walk" } }));
    expect(within(details()).getByRole("heading", { name: /Tokyo night walk/ })).toBeInTheDocument();
    expect(within(details()).getByText(/^youtube\.com · Saved just now · on iPhone$/)).toBeInTheDocument();
    expect(within(details()).getByText("New")).toBeInTheDocument();
    expect(within(details()).getByText("Coming soon")).toBeInTheDocument();
    expect(within(details()).getByRole("link", { name: /Open ↗/ })).toHaveAttribute("href", "https://www.youtube.com/watch?v=1");
  });

  it("shows the page's own description", async () => {
    await renderDetails(savedLink({ resource: { description: "How ownership works, with examples." } }));
    expect(within(details()).getByRole("region", { name: "From the page" })).toHaveTextContent("How ownership works, with examples.");
  });

  it("shows no description when the page has none", async () => {
    await renderDetails(savedLink({ resource: { description: "   " } }));
    expect(within(details()).queryByRole("region", { name: "From the page" })).not.toBeInTheDocument();
  });

  it("goes back to the list's own history entry when the details were opened from a row", async () => {
    const link = savedLink({ resource: { title: "Rust by Example" } });
    const queryClient = testQueryClient();
    queryClient.setQueryData<LinksPages>(linksKeys.list("all"), { pages: [{ items: [link], cursor: null }], pageParams: [undefined] });
    const { router } = await renderWithRouter(
      <>
        <LinkRow link={link} now={Date.now()} />
        <LinkDetails />
      </>,
      { queryClient },
    );
    await userEvent.click(screen.getByRole("link", { name: /^Rust by Example/ }));
    await userEvent.click(within(details()).getByRole("button", { name: "Back" }));
    await waitFor(() => { expect(router.state.location.search).toEqual({}); });
    expect(router.history.canGoBack()).toBe(false);
  });

  it("offers no Open for a saved URL that is not http or https", async () => {
    await renderDetails(savedLink({ originalUrl: "javascript:alert(1)" }));
    expect(within(details()).queryByRole("link", { name: /Open/ })).not.toBeInTheDocument();
  });

  it("links each collection tag to its collection", async () => {
    await renderDetails(savedLink({ collections: [{ id: rust.id, name: "rust" }] }));
    expect(within(details()).getByRole("link", { name: "Rust" })).toHaveAttribute("href", `/c/${rust.id}`);
    expect(within(details()).queryByText("New")).not.toBeInTheDocument();
  });

  it("opens the collection picker from + Add to", async () => {
    await renderDetails(savedLink());
    await userEvent.click(within(details()).getByRole("button", { name: "+ Add to" }));
    expect(await screen.findByRole("button", { name: /Rust/, pressed: false })).toBeInTheDocument();
  });

  it("renames the link in place, and the lists show the new title at once", async () => {
    request.mockImplementation(() => new Promise(() => undefined));
    const { cachedTitle } = await renderDetails(savedLink({ resource: { title: "Fetched title" } }));
    await userEvent.click(screen.getByRole("button", { name: /Fetched title/ }));
    const input = screen.getByRole("textbox", { name: "Title" });
    await userEvent.clear(input);
    await userEvent.type(input, "  My   name {Enter}");
    expect(patches()).toEqual([{ titleOverride: "My name" }]);
    expect(cachedTitle()?.titleOverride).toBe("My name");
  });

  it("brings back the fetched title when the title is cleared", async () => {
    await renderDetails(savedLink({ titleOverride: "My name", resource: { title: "Fetched title" } }));
    await userEvent.click(screen.getByRole("button", { name: /My name/ }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Title" }));
    await userEvent.keyboard("{Enter}");
    expect(patches()).toEqual([{ titleOverride: null }]);
    expect(await screen.findByRole("button", { name: /Fetched title/ })).toBeInTheDocument();
  });

  it("cancels a rename with Esc", async () => {
    await renderDetails(savedLink({ resource: { title: "Fetched title" } }));
    await userEvent.click(screen.getByRole("button", { name: /Fetched title/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), " more{Escape}");
    expect(patches()).toEqual([]);
    expect(screen.getByRole("button", { name: /Fetched title/ })).toBeInTheDocument();
    expect(details()).toBeInTheDocument();
  });

  it("says why a title cannot be saved, inline", async () => {
    request.mockImplementation((path, _schema, init) =>
      init?.method === "PATCH" ? Promise.reject(new Error("offline")) : Promise.resolve(path === "/collections" ? { items: [] } : null),
    );
    const { cachedTitle } = await renderDetails(savedLink({ resource: { title: "Fetched title" } }));
    await userEvent.click(screen.getByRole("button", { name: /Fetched title/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), " more{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the title. Try again.");
    expect(cachedTitle()?.titleOverride).toBeNull();
  });

  it("saves the note once typing pauses, not on every keystroke", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    await renderDetails(savedLink());
    await user.type(screen.getByRole("textbox", { name: "Note" }), "watch later");
    expect(patches()).toEqual([]);
    await act(() => vi.advanceTimersByTimeAsync(NOTE_SAVE_DELAY_MS));
    expect(patches()).toEqual([{ note: "watch later" }]);
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("saves the note at once when the field loses focus", async () => {
    await renderDetails(savedLink());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "for the trip");
    await userEvent.tab();
    expect(patches()).toEqual([{ note: "for the trip" }]);
  });

  it("saves the note when the details close before the pause", async () => {
    await renderDetails(savedLink());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "read on the train");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => { expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); });
    expect(patches()).toEqual([{ note: "read on the train" }]);
  });

  it("saves the note through the usual queue when the page is hidden, since the page stays alive", async () => {
    await renderDetails(savedLink());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "before switching");
    hidePage();
    await waitFor(() => { expect(patches()).toEqual([{ note: "before switching" }]); });
    expect(request).not.toHaveBeenCalledWith(expect.any(String), expect.anything(), expect.objectContaining({ keepalive: true }));
  });

  it("says so inline, with Try again, when the save on hiding the page fails", async () => {
    failPatches();
    await renderDetails(savedLink());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "offline note");
    hidePage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your note.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("shows the failure, and keeps the note to resend, when a save on pagehide fails but the page stays", async () => {
    failPatches();
    await renderDetails(savedLink());
    const note = screen.getByRole("textbox", { name: "Note" });
    await userEvent.type(note, "bfcache note");
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your note.");
    request.mockClear();
    request.mockImplementation(() => Promise.resolve(null));
    act(() => { note.blur(); });
    await waitFor(() => { expect(patches()).toEqual([{ note: "bfcache note" }]); });
  });

  it("saves the note when the page is being unloaded", async () => {
    await renderDetails(savedLink());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "on pagehide");
    // No await between the event and the check: a reload gives the page no microtasks to spare.
    window.dispatchEvent(new Event("pagehide"));
    expect(patches()).toEqual([{ note: "on pagehide" }]);
    expect(request).toHaveBeenCalledWith(expect.any(String), expect.anything(), expect.objectContaining({ keepalive: true }));
  });

  it("says so when an unsaveable note is dropped as the details close", async () => {
    await renderDetails(savedLink());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "a‮b");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByText("Your note has characters that can't be saved, so it wasn't kept.")).toBeInTheDocument();
    expect(patches()).toEqual([]);
  });

  it("refuses a note with characters the API rejects, without sending it", async () => {
    await renderDetails(savedLink());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "a‮b");
    await userEvent.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Your note has characters that can't be saved.");
    expect(patches()).toEqual([]);
  });

  it("deletes with Undo: the details close, and Undo sends nothing", async () => {
    const link = savedLink();
    await renderDetails(link);
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => { expect(screen.queryByRole("dialog")).not.toBeInTheDocument(); });
    expect(useLinksUi.getState().deletingIds).toEqual([link.id]);
    // A plain click: sonner's swipe handler wants pointer capture, which jsdom lacks.
    const undo = await screen.findByRole("button", { name: "Undo" });
    act(() => { undo.click(); });
    expect(useLinksUi.getState().deletingIds).toEqual([]);
    expect(request.mock.calls.some(([, , init]) => init?.method === "DELETE")).toBe(false);
  });

  it("sends the DELETE only when the Undo toast closes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    const link = savedLink();
    await renderDetails(link);
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(request.mock.calls.some(([, , init]) => init?.method === "DELETE")).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(6000));
    await waitFor(() => { expect(request).toHaveBeenCalledWith(`/links/${link.id}`, expect.anything(), { method: "DELETE" }); });
  });
});

describe("a link no loaded list holds", () => {
  const reads = (id: string) => request.mock.calls.filter(([path, , init]) => path === `/links/${id}` && init?.method === undefined);

  async function renderUnlisted(link: SavedLink, read: () => Promise<unknown>) {
    request.mockImplementation((path, _schema, init) => {
      if (init?.method === "PATCH") return new Promise(() => undefined);
      if (path === `/links/${link.id}`) return read();
      return Promise.resolve(path === "/collections" ? { items: [] } : null);
    });
    const queryClient = testQueryClient();
    queryClient.setQueryData<LinksPages>(linksKeys.list("all"), { pages: [{ items: [savedLink()], cursor: "next" }], pageParams: [undefined] });
    return renderWithRouter(<LinkDetails />, { path: `/?link=${link.id}`, queryClient });
  }

  it("is fetched, with Loading shown until it arrives", async () => {
    const link = savedLink({ resource: { title: "Deep in the list" } });
    const { promise, resolve: arrive } = Promise.withResolvers<SavedLink>();
    await renderUnlisted(link, () => promise);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    act(() => { arrive(link); });
    expect(await within(details()).findByRole("heading", { name: /Deep in the list/ })).toBeInTheDocument();
    expect(reads(link.id)).toHaveLength(1);
  });

  it("is not fetched when a loaded list holds it", async () => {
    const link = savedLink({ resource: { title: "On the first page" } });
    await renderDetails(link);
    expect(within(details()).getByRole("heading", { name: /On the first page/ })).toBeInTheDocument();
    expect(reads(link.id)).toEqual([]);
  });

  it("reads as not found when the API has no such link", async () => {
    const link = savedLink();
    await renderUnlisted(link, () => Promise.reject(new ApiError(ERROR_CODES.NOT_FOUND, "Link not found")));
    expect(await within(details()).findByText("Couldn't find this link")).toBeInTheDocument();
    expect(reads(link.id)).toHaveLength(1);
  });

  it("offers Try again when the read fails for any other reason, and Try again reads it again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    const link = savedLink({ resource: { title: "Back after a blip" } });
    let failing = true;
    await renderUnlisted(link, () =>
      failing ? Promise.reject(new ApiError(ERROR_CODES.INTERNAL, "Something went wrong")) : Promise.resolve(link),
    );
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(within(details()).getByRole("alert")).toHaveTextContent("Couldn't load this link");
    expect(within(details()).queryByText("Couldn't find this link")).not.toBeInTheDocument();

    failing = false;
    await user.click(within(details()).getByRole("button", { name: "Try again" }));
    expect(await within(details()).findByRole("heading", { name: /Back after a blip/ })).toBeInTheDocument();
  });

  it("takes a rename into its own copy at once", async () => {
    const link = savedLink({ resource: { title: "Fetched title" } });
    const { queryClient } = await renderUnlisted(link, () => Promise.resolve(link));
    await userEvent.click(await screen.findByRole("button", { name: /Fetched title/ }));
    const input = screen.getByRole("textbox", { name: "Title" });
    await userEvent.clear(input);
    await userEvent.type(input, "My name{Enter}");
    expect(patches()).toEqual([{ titleOverride: "My name" }]);
    expect(queryClient.getQueryData<SavedLink>(linksKeys.detail(link.id))?.titleOverride).toBe("My name");
  });
});

describe("a link saved moments ago", () => {
  const fetched = savedLink({ originalUrl: "https://example.com/new", resource: { title: "Metadata landed", fetchStatus: "fetched" } });
  const waiting = { ...fetched, resource: { ...fetched.resource, title: null, fetchStatus: "pending" as const } };
  const listOf = (link: SavedLink): LinksPages => ({ pages: [{ items: [link], cursor: null }], pageParams: [undefined] });

  it("shows the freshest copy when a list off screen still holds it as pending", async () => {
    const queryClient = testQueryClient();
    queryClient.setQueryData(linksKeys.list("all"), listOf(waiting), { updatedAt: 1000 });
    queryClient.setQueryData(linksKeys.list("inbox"), listOf(fetched), { updatedAt: 2000 });
    await renderWithRouter(<LinkDetails />, { path: `/?link=${fetched.id}`, queryClient });
    expect(within(details()).getByRole("heading", { name: /Metadata landed/ })).toBeInTheDocument();
  });

  it("keeps the fetched copy when a change to another link re-stamps every list", async () => {
    const other = savedLink();
    const queryClient = testQueryClient();
    queryClient.setQueryData(linksKeys.list("all"), listOf(waiting), { updatedAt: 1000 });
    queryClient.setQueryData(linksKeys.list("inbox"), { pages: [{ items: [fetched, other], cursor: null }], pageParams: [undefined] }, { updatedAt: 2000 });
    await renderWithRouter(<LinkDetails />, { path: `/?link=${fetched.id}`, queryClient });
    // A pin, then a delete, of the other link; the cache notifies on the next tick.
    await act(async () => {
      updateCachedLink(queryClient, other.id, (link) => ({ ...link, pinned: true }));
      queryClient.setQueriesData<LinksPages>({ queryKey: linksKeys.lists }, (data) =>
        data && { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== other.id) })) },
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(within(details()).getByRole("heading", { name: /Metadata landed/ })).toBeInTheDocument();
    expect(request.mock.calls.filter(([path]) => path === `/links/${fetched.id}`)).toEqual([]);
  });

  it("fetches the link itself while every cached copy is still pending", async () => {
    request.mockImplementation((path) => Promise.resolve(path === `/links/${fetched.id}` ? fetched : path === "/collections" ? { items: [] } : null));
    const queryClient = testQueryClient();
    queryClient.setQueryData(linksKeys.list("all"), listOf(waiting));
    await renderWithRouter(<LinkDetails />, { path: `/?link=${fetched.id}`, queryClient });
    expect(await within(details()).findByRole("heading", { name: /Metadata landed/ })).toBeInTheDocument();
  });
});

describe("link details on the web", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: true, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("closes with Esc from inside the panel", async () => {
    const { router } = await renderDetails(savedLink());
    expect(screen.getByRole("region", { name: "Link details" })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await waitFor(() => { expect(screen.queryByRole("region", { name: "Link details" })).not.toBeInTheDocument(); });
    expect(router.state.location.search).toEqual({});
  });

  it("closes only the picker when Esc is pressed inside it", async () => {
    await renderDetails(savedLink());
    await userEvent.click(screen.getByRole("button", { name: "+ Add to" }));
    await screen.findByRole("textbox", { name: "Find or create a collection" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => { expect(screen.queryByRole("textbox", { name: "Find or create a collection" })).not.toBeInTheDocument(); });
    expect(screen.getByRole("region", { name: "Link details" })).toBeInTheDocument();
  });

  it("opens as a side panel that arrow keys resize, and remembers the width", async () => {
    await renderDetails(savedLink());
    const panel = screen.getByRole("region", { name: "Link details" });
    expect(panel).toHaveStyle({ width: "480px" });
    const grip = screen.getByRole("separator", { name: "Resize link details" });
    grip.focus();
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(panel).toHaveStyle({ width: "512px" });
    expect(grip).toHaveAttribute("aria-valuenow", "512");
    expect(localStorage.getItem("linkables.detailsWidth")).toBe("512");
  });

  it("never grows past what the window has room for, and says so", async () => {
    vi.stubGlobal("innerWidth", 1000);
    await renderDetails(savedLink());
    const grip = screen.getByRole("separator", { name: "Resize link details" });
    expect(grip).toHaveAttribute("aria-valuemax", "700");
    grip.focus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("region", { name: "Link details" })).toHaveStyle({ width: "700px" });
    expect(grip).toHaveAttribute("aria-valuenow", "700");
    expect(localStorage.getItem("linkables.detailsWidth")).toBe("700");
  });
});
