import { ERROR_CODES } from "@linkables/shared/http";
import type { SavedLink } from "@linkables/shared/links";
import type { ReaderView } from "@linkables/shared/reader";
import { useRouterState } from "@tanstack/react-router";
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
import { resetViewport, stubViewport } from "../test/viewport";
import { LinkPage } from "./LinkPage";
import { NOTE_SAVE_DELAY_MS } from "./use-note-autosave";

type Request = (path: string, schema: unknown, init?: RequestInit) => Promise<unknown>;
const request = vi.hoisted(() => vi.fn<Request>());
vi.mock("../api/api", () => ({ api: { request } }));

const rust = listedCollection({ name: "rust" });

function answer(path: string): unknown {
  return path === "/collections" ? { items: [rust] } : null;
}

beforeEach(() => {
  request.mockReset();
  request.mockImplementation((path) => Promise.resolve(answer(path)));
  useLinksUi.setState({ deletingIds: [], leavingIds: [], returnFocusId: null, addToLinkId: null });
  stubViewport(1440);
});

afterEach(() => {
  vi.useRealTimers();
  resetViewport();
});

// The link's page on /l/…, and its row on any other address, as the app has them.
function PageOrRow({ link }: { link: SavedLink }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname.startsWith("/l/") ? <LinkPage /> : <LinkRow link={link} now={Date.now()} />;
}

const listOf = (...links: SavedLink[]): LinksPages => ({ pages: [{ items: links, cursor: null }], pageParams: [undefined] });

async function renderPage(link: SavedLink, { path = `/l/${link.id}`, listed = true } = {}) {
  const queryClient = testQueryClient();
  const firstPage = listed ? listOf(link) : { pages: [{ items: [savedLink()], cursor: "next" }], pageParams: [undefined] };
  queryClient.setQueryData<LinksPages>(linksKeys.list("all"), firstPage);
  const rendered = await renderWithRouter(
    <>
      <PageOrRow link={link} />
      <Toaster />
    </>,
    { path, queryClient },
  );
  const cachedLink = () => queryClient.getQueryData<LinksPages>(linksKeys.list("all"))?.pages[0]?.items[0];
  return { ...rendered, cachedLink };
}

function patches() {
  return request.mock.calls.filter(([, , init]) => init?.method === "PATCH").map(([, , init]) => JSON.parse(init?.body as string) as unknown);
}

function calls(path: string) {
  return request.mock.calls.filter(([called, , init]) => called === path && init?.method === undefined);
}

// The first banner: jsdom also counts the article's own header as one, which browsers do not.
const bar = () => screen.getAllByRole("banner")[0] as HTMLElement;
const actions = () => within(bar()).getByRole("group", { name: "Link actions" });

function hidePage() {
  const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  act(() => { document.dispatchEvent(new Event("visibilitychange")); });
  visibility.mockRestore();
}

function failPatches() {
  request.mockImplementation((path, _schema, init) => (init?.method === "PATCH" ? Promise.reject(new Error("offline")) : Promise.resolve(answer(path))));
}

const ARTICLE: ReaderView = {
  status: "ok",
  url: "https://example.com/article",
  article: {
    title: "How we cut build times",
    byline: "Ada Lovelace",
    siteName: "Example Engineering",
    minutes: 4,
    truncated: false,
    blocks: [{ type: "paragraph", content: [{ text: "Our pipeline was slow." }] }],
  },
};

function serveArticle(link: SavedLink) {
  request.mockImplementation((path) => Promise.resolve(path === `/links/${link.id}/reader` ? ARTICLE : answer(path)));
}

describe("a link's preview", () => {
  it("shows the link, where it is filed and the way out to the video", async () => {
    await renderPage(savedLink({ originalUrl: "https://www.youtube.com/watch?v=1", savedFrom: "iphone", resource: { title: "Tokyo night walk", kind: "video" } }));
    expect(screen.getByRole("heading", { level: 1, name: /Tokyo night walk/ })).toBeInTheDocument();
    expect(screen.getByText(/^youtube\.com · Saved just now · on iPhone$/)).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(within(screen.getByRole("main")).getByRole("link", { name: /^Watch on YouTube/ })).toHaveAttribute("href", "https://www.youtube.com/watch?v=1");
  });

  it("offers Open original for a page with no article", async () => {
    const link = savedLink({ originalUrl: "https://example.com/paywalled" });
    request.mockImplementation((path) => Promise.resolve(path === `/links/${link.id}/reader` ? { status: "unavailable", url: link.originalUrl } : answer(path)));
    await renderPage(link);
    expect(await within(screen.getByRole("main")).findByRole("link", { name: /^Open original/ })).toHaveAttribute("href", "https://example.com/paywalled");
  });

  it("never asks for the reader of a video or a file", async () => {
    for (const kind of ["video", "other"] as const) {
      const link = savedLink({ resource: { kind } });
      const { unmount } = await renderPage(link);
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
      expect(calls(`/links/${link.id}/reader`)).toEqual([]);
      unmount();
    }
  });

  it("shows the page's own description", async () => {
    await renderPage(savedLink({ resource: { kind: "video", description: "How ownership works, with examples." } }));
    expect(screen.getByRole("region", { name: "From the page" })).toHaveTextContent("How ownership works, with examples.");
  });

  it("shows no description when the page has none", async () => {
    await renderPage(savedLink({ resource: { kind: "video", description: "   " } }));
    expect(screen.queryByRole("region", { name: "From the page" })).not.toBeInTheDocument();
  });

  it("offers no Open original for a saved URL that is not http or https", async () => {
    await renderPage(savedLink({ originalUrl: "javascript:alert(1)", resource: { kind: "video" } }));
    expect(screen.queryByRole("link", { name: /Open original|Watch on/ })).not.toBeInTheDocument();
  });

  it("links each collection tag to its collection", async () => {
    await renderPage(savedLink({ resource: { kind: "video" }, collections: [{ id: rust.id, name: "rust" }] }));
    expect(screen.getByRole("link", { name: "Rust" })).toHaveAttribute("href", `/c/${rust.id}`);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("opens the collection picker from + Add to", async () => {
    await renderPage(savedLink({ resource: { kind: "video" } }));
    await userEvent.click(screen.getByRole("button", { name: "+ Add to" }));
    expect(await screen.findByRole("button", { name: /Rust/, pressed: false })).toBeInTheDocument();
  });

  it("says the article could not be fetched, and Try again asks again", async () => {
    const link = savedLink();
    let failing = true;
    request.mockImplementation((path) =>
      path === `/links/${link.id}/reader`
        ? failing ? Promise.reject(new ApiError(ERROR_CODES.RATE_LIMIT, "Slow down")) : Promise.resolve(ARTICLE)
        : Promise.resolve(answer(path)),
    );
    await renderPage(link);
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't get the article.");
    failing = false;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: "How we cut build times" })).toBeInTheDocument();
  });

  it("puts focus on the title when the page arrives", async () => {
    await renderPage(savedLink({ resource: { kind: "video", title: "Tokyo night walk" } }));
    expect(screen.getByRole("heading", { level: 1, name: /Tokyo night walk/ })).toHaveFocus();
  });

  it("takes Note to the note on the page instead of opening an editor", async () => {
    await renderPage(savedLink({ resource: { kind: "video" } }));
    await userEvent.click(within(actions()).getByRole("button", { name: /^Note/ }));
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveFocus();
    expect(screen.getAllByRole("textbox", { name: "Note" })).toHaveLength(1);
  });
});

describe("a link's article", () => {
  it("shows the article under the bar, with its site, reading time and text size", async () => {
    const link = savedLink();
    serveArticle(link);
    await renderPage(link);
    const title = await screen.findByRole("heading", { level: 1, name: "How we cut build times" });
    expect(title).toHaveFocus();
    expect(within(bar()).getByText("Example Engineering · 4 min read")).toBeInTheDocument();
    expect(within(bar()).getByRole("group", { name: "Text size" })).toBeInTheDocument();
    expect(screen.getByText("Our pipeline was slow.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Note" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to my links" })).toHaveAttribute("href", "/");
  });

  it("says it is getting the article while it loads", async () => {
    const link = savedLink();
    const { promise, resolve } = Promise.withResolvers<ReaderView>();
    request.mockImplementation((path) => (path === `/links/${link.id}/reader` ? promise : Promise.resolve(answer(path))));
    await renderPage(link);
    expect(screen.getByRole("status")).toHaveTextContent("Getting the article…");
    act(() => { resolve(ARTICLE); });
    expect(await screen.findByRole("heading", { level: 1, name: "How we cut build times" })).toBeInTheDocument();
  });

  it("edits the note in a popover from the bar, and marks the button once there is a note", async () => {
    const link = savedLink();
    serveArticle(link);
    await renderPage(link);
    await screen.findByRole("heading", { level: 1 });
    await userEvent.click(within(actions()).getByRole("button", { name: "Note" }));
    const note = await screen.findByRole("textbox", { name: "Note" });
    await userEvent.type(note, "for the trip");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => { expect(screen.queryByRole("textbox", { name: "Note" })).not.toBeInTheDocument(); });
    expect(patches()).toEqual([{ note: "for the trip" }]);
    // jsdom drops the space between the label and its hidden suffix; browsers keep it.
    expect(within(actions()).getByRole("button", { name: /^Note ?\(has a note\)$/ })).toBeInTheDocument();
  });
});

describe("the link page's bar", () => {
  it("pins the link", async () => {
    await renderPage(savedLink({ resource: { kind: "video" } }));
    await userEvent.click(within(actions()).getByRole("button", { name: "Pin" }));
    expect(patches()).toEqual([{ pinned: true }]);
    expect(within(actions()).getByRole("button", { name: "Pinned" })).toHaveAttribute("aria-pressed", "true");
  });

  it("goes back to the list it came from, and the list gets focus back on the row", async () => {
    const link = savedLink({ resource: { title: "Rust by Example", kind: "video" } });
    const { router } = await renderPage(link, { path: "/" });
    await userEvent.click(screen.getByRole("link", { name: /^Rust by Example/ }));
    await userEvent.click(await within(bar()).findByRole("button", { name: "Back" }));
    await waitFor(() => { expect(router.state.location.pathname).toBe("/"); });
    expect(router.history.canGoBack()).toBe(false);
    expect(useLinksUi.getState().returnFocusId).toBe(link.id);
  });

  it("goes to All links from a page that was opened directly", async () => {
    const { router } = await renderPage(savedLink({ resource: { kind: "video" } }));
    await userEvent.click(within(bar()).getByRole("button", { name: "Back" }));
    await waitFor(() => { expect(router.state.location.pathname).toBe("/"); });
  });

  it("goes back with Esc", async () => {
    const { router } = await renderPage(savedLink({ resource: { kind: "video" } }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => { expect(router.state.location.pathname).toBe("/"); });
  });

  it("closes only the picker when Esc is pressed inside it", async () => {
    const { router } = await renderPage(savedLink({ resource: { kind: "video" } }));
    await userEvent.click(within(actions()).getByRole("button", { name: "Add to" }));
    await screen.findByRole("textbox", { name: "Find or create a collection" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => { expect(screen.queryByRole("textbox", { name: "Find or create a collection" })).not.toBeInTheDocument(); });
    expect(router.state.location.pathname).toMatch(/^\/l\//);
  });

  it("deletes with Undo and leaves the page, and Undo sends nothing", async () => {
    const link = savedLink({ resource: { kind: "video" } });
    const { router } = await renderPage(link);
    await userEvent.click(within(actions()).getByRole("button", { name: "Delete" }));
    await waitFor(() => { expect(router.state.location.pathname).toBe("/"); });
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
    const link = savedLink({ resource: { kind: "video" } });
    await renderPage(link);
    await user.click(within(actions()).getByRole("button", { name: "Delete" }));
    expect(request.mock.calls.some(([, , init]) => init?.method === "DELETE")).toBe(false);
    await act(() => vi.advanceTimersByTimeAsync(6000));
    await waitFor(() => { expect(request).toHaveBeenCalledWith(`/links/${link.id}`, expect.anything(), { method: "DELETE" }); });
  });
});

describe("the link page on a phone", () => {
  beforeEach(resetViewport);

  it("keeps Share and Open original on the bar and the rest under More", async () => {
    const link = savedLink();
    serveArticle(link);
    await renderPage(link);
    await screen.findByRole("heading", { level: 1 });
    expect(within(actions()).getByRole("button", { name: "Share" })).toBeInTheDocument();
    expect(within(actions()).getByRole("link", { name: /^Open original/ })).toBeInTheDocument();
    expect(within(actions()).queryByRole("button", { name: "Pin" })).not.toBeInTheDocument();
    await userEvent.click(within(actions()).getByRole("button", { name: "More actions" }));
    const menu = await screen.findByRole("menu");
    const items = [...within(menu).getAllByRole("menuitem"), ...within(menu).getAllByRole("menuitemradio")];
    items.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    expect(items.map((item) => item.textContent)).toEqual([
      "Pin",
      "Add to…",
      "Note",
      "Smaller text",
      "Default text",
      "Larger text",
      "Delete",
    ]);
  });

  it("opens the Add to sheet from More", async () => {
    const link = savedLink({ resource: { kind: "video", title: "Tokyo night walk" } });
    await renderPage(link);
    await userEvent.click(within(actions()).getByRole("button", { name: "More actions" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Add to…" }));
    expect(await screen.findByRole("dialog", { name: /Tokyo night walk/ })).toBeInTheDocument();
  });
});

describe("renaming a link", () => {
  beforeEach(() => {
    request.mockImplementation((path) => Promise.resolve(path.endsWith("/reader") ? { status: "unavailable", url: "" } : answer(path)));
  });

  it("renames the link in place, and the lists show the new title at once", async () => {
    request.mockImplementation((path, _schema, init) => (init?.method === "PATCH" ? new Promise(() => undefined) : Promise.resolve(answer(path))));
    const { cachedLink } = await renderPage(savedLink({ resource: { kind: "video", title: "Fetched title" } }));
    await userEvent.click(screen.getByRole("button", { name: /Fetched title/ }));
    const input = screen.getByRole("textbox", { name: "Title" });
    await userEvent.clear(input);
    await userEvent.type(input, "  My   name {Enter}");
    expect(patches()).toEqual([{ titleOverride: "My name" }]);
    expect(cachedLink()?.titleOverride).toBe("My name");
  });

  it("brings back the fetched title when the title is cleared", async () => {
    await renderPage(savedLink({ titleOverride: "My name", resource: { kind: "video", title: "Fetched title" } }));
    await userEvent.click(screen.getByRole("button", { name: /My name/ }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Title" }));
    await userEvent.keyboard("{Enter}");
    expect(patches()).toEqual([{ titleOverride: null }]);
    expect(await screen.findByRole("button", { name: /Fetched title/ })).toBeInTheDocument();
  });

  it("cancels a rename with Esc, and stays on the page", async () => {
    const { router } = await renderPage(savedLink({ resource: { kind: "video", title: "Fetched title" } }));
    await userEvent.click(screen.getByRole("button", { name: /Fetched title/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), " more{Escape}");
    expect(patches()).toEqual([]);
    expect(screen.getByRole("button", { name: /Fetched title/ })).toBeInTheDocument();
    expect(router.state.location.pathname).toMatch(/^\/l\//);
  });

  it("says why a title cannot be saved, inline", async () => {
    failPatches();
    const { cachedLink } = await renderPage(savedLink({ resource: { kind: "video", title: "Fetched title" } }));
    await userEvent.click(screen.getByRole("button", { name: /Fetched title/ }));
    await userEvent.type(screen.getByRole("textbox", { name: "Title" }), " more{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save the title. Try again.");
    expect(cachedLink()?.titleOverride).toBeNull();
  });
});

describe("the note on the page", () => {
  const video = () => savedLink({ resource: { kind: "video" } });

  it("saves once typing pauses, not on every keystroke", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    await renderPage(video());
    await user.type(screen.getByRole("textbox", { name: "Note" }), "watch later");
    expect(patches()).toEqual([]);
    await act(() => vi.advanceTimersByTimeAsync(NOTE_SAVE_DELAY_MS));
    expect(patches()).toEqual([{ note: "watch later" }]);
    expect(await screen.findByText("Saved")).toBeInTheDocument();
  });

  it("saves at once when the field loses focus", async () => {
    await renderPage(video());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "for the trip");
    await userEvent.tab();
    expect(patches()).toEqual([{ note: "for the trip" }]);
  });

  it("saves when the page is left before the pause", async () => {
    await renderPage(video());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "read on the train");
    await userEvent.click(within(bar()).getByRole("button", { name: "Back" }));
    await waitFor(() => { expect(screen.queryByRole("textbox", { name: "Note" })).not.toBeInTheDocument(); });
    expect(patches()).toEqual([{ note: "read on the train" }]);
  });

  it("saves through the usual queue when the page is hidden, since the page stays alive", async () => {
    await renderPage(video());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "before switching");
    hidePage();
    await waitFor(() => { expect(patches()).toEqual([{ note: "before switching" }]); });
    expect(request).not.toHaveBeenCalledWith(expect.any(String), expect.anything(), expect.objectContaining({ keepalive: true }));
  });

  it("says so inline, with Try again, when the save on hiding the page fails", async () => {
    failPatches();
    await renderPage(video());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "offline note");
    hidePage();
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your note.");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.queryByText("Saved")).not.toBeInTheDocument();
  });

  it("shows the failure, and keeps the note to resend, when a save on pagehide fails but the page stays", async () => {
    failPatches();
    await renderPage(video());
    const note = screen.getByRole("textbox", { name: "Note" });
    await userEvent.type(note, "bfcache note");
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save your note.");
    request.mockClear();
    request.mockImplementation(() => Promise.resolve(null));
    act(() => { note.blur(); });
    await waitFor(() => { expect(patches()).toEqual([{ note: "bfcache note" }]); });
  });

  it("saves when the page is being unloaded", async () => {
    await renderPage(video());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "on pagehide");
    // No await between the event and the check: a reload gives the page no microtasks to spare.
    window.dispatchEvent(new Event("pagehide"));
    expect(patches()).toEqual([{ note: "on pagehide" }]);
    expect(request).toHaveBeenCalledWith(expect.any(String), expect.anything(), expect.objectContaining({ keepalive: true }));
  });

  it("says so when an unsaveable note is dropped as the page is left", async () => {
    await renderPage(video());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "a‮b");
    await userEvent.click(within(bar()).getByRole("button", { name: "Back" }));
    expect(await screen.findByText("Your note has characters that can't be saved, so it wasn't kept.")).toBeInTheDocument();
    expect(patches()).toEqual([]);
  });

  it("refuses a note with characters the API rejects, without sending it", async () => {
    await renderPage(video());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "a‮b");
    await userEvent.tab();
    expect(await screen.findByRole("alert")).toHaveTextContent("Your note has characters that can't be saved.");
    expect(patches()).toEqual([]);
  });
});

describe("a link no loaded list holds", () => {
  async function renderUnlisted(link: SavedLink, read: () => Promise<unknown>) {
    request.mockImplementation((path, _schema, init) => {
      if (init?.method === "PATCH") return new Promise(() => undefined);
      if (path === `/links/${link.id}`) return read();
      return Promise.resolve(answer(path));
    });
    return renderPage(link, { listed: false });
  }

  it("is fetched, with Loading shown until it arrives", async () => {
    const link = savedLink({ resource: { kind: "video", title: "Deep in the list" } });
    const { promise, resolve: arrive } = Promise.withResolvers<SavedLink>();
    await renderUnlisted(link, () => promise);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    act(() => { arrive(link); });
    expect(await screen.findByRole("heading", { level: 1, name: /Deep in the list/ })).toBeInTheDocument();
    expect(calls(`/links/${link.id}`)).toHaveLength(1);
  });

  it("is not fetched when a loaded list holds it", async () => {
    const link = savedLink({ resource: { kind: "video", title: "On the first page" } });
    await renderPage(link);
    expect(screen.getByRole("heading", { level: 1, name: /On the first page/ })).toBeInTheDocument();
    expect(calls(`/links/${link.id}`)).toEqual([]);
  });

  it("reads as not found when the API has no such link", async () => {
    const link = savedLink();
    await renderUnlisted(link, () => Promise.reject(new ApiError(ERROR_CODES.NOT_FOUND, "Link not found")));
    expect(await screen.findByText("Couldn't find this link")).toBeInTheDocument();
    expect(calls(`/links/${link.id}`)).toHaveLength(1);
    expect(calls(`/links/${link.id}/reader`)).toEqual([]);
  });

  it("offers Try again when the read fails for any other reason, and Try again reads it again", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
    const link = savedLink({ resource: { kind: "video", title: "Back after a blip" } });
    let failing = true;
    await renderUnlisted(link, () =>
      failing ? Promise.reject(new ApiError(ERROR_CODES.INTERNAL, "Something went wrong")) : Promise.resolve(link),
    );
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load this link");
    expect(screen.queryByText("Couldn't find this link")).not.toBeInTheDocument();

    failing = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Back after a blip/ })).toBeInTheDocument();
  });

  it("takes a rename into its own copy at once", async () => {
    const link = savedLink({ resource: { kind: "video", title: "Fetched title" } });
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
  const fetched = savedLink({ originalUrl: "https://example.com/new", resource: { title: "Metadata landed", kind: "video", fetchStatus: "fetched" } });
  const waiting = { ...fetched, resource: { ...fetched.resource, title: null, fetchStatus: "pending" as const } };

  async function renderWith(queryClient: ReturnType<typeof testQueryClient>) {
    return renderWithRouter(<LinkPage />, { path: `/l/${fetched.id}`, queryClient });
  }

  it("shows the freshest copy when a list off screen still holds it as pending", async () => {
    const queryClient = testQueryClient();
    queryClient.setQueryData(linksKeys.list("all"), listOf(waiting), { updatedAt: 1000 });
    queryClient.setQueryData(linksKeys.list("inbox"), listOf(fetched), { updatedAt: 2000 });
    await renderWith(queryClient);
    expect(screen.getByRole("heading", { level: 1, name: /Metadata landed/ })).toBeInTheDocument();
  });

  it("keeps the fetched copy when a change to another link re-stamps every list", async () => {
    const other = savedLink();
    const queryClient = testQueryClient();
    queryClient.setQueryData(linksKeys.list("all"), listOf(waiting), { updatedAt: 1000 });
    queryClient.setQueryData(linksKeys.list("inbox"), listOf(fetched, other), { updatedAt: 2000 });
    await renderWith(queryClient);
    // A pin, then a delete, of the other link; the cache notifies on the next tick.
    await act(async () => {
      updateCachedLink(queryClient, other.id, (link) => ({ ...link, pinned: true }));
      queryClient.setQueriesData<LinksPages>({ queryKey: linksKeys.lists }, (data) =>
        data && { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.filter((item) => item.id !== other.id) })) },
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.getByRole("heading", { level: 1, name: /Metadata landed/ })).toBeInTheDocument();
    expect(calls(`/links/${fetched.id}`)).toEqual([]);
  });

  it("fetches the link itself while every cached copy is still pending", async () => {
    request.mockImplementation((path) => Promise.resolve(path === `/links/${fetched.id}` ? fetched : answer(path)));
    const queryClient = testQueryClient();
    queryClient.setQueryData(linksKeys.list("all"), listOf(waiting));
    await renderWith(queryClient);
    expect(await screen.findByRole("heading", { level: 1, name: /Metadata landed/ })).toBeInTheDocument();
  });
});
