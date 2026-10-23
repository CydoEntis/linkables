import type { SavedLink } from "@linkables/shared/links";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/sonner";
import { listedCollection } from "../collections/test-collections";
import { useLinksUi } from "../links/links-ui-store";
import { savedLink } from "../links/test-links";
import { linksKeys, type LinksPages } from "../links/use-links";
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

describe("link details", () => {
  it("shows the link, where it is filed, and the summary still to come", async () => {
    await renderDetails(savedLink({ originalUrl: "https://www.youtube.com/watch?v=1", savedFrom: "iphone", resource: { title: "Tokyo night walk" } }));
    expect(within(details()).getByRole("heading", { name: /Tokyo night walk/ })).toBeInTheDocument();
    expect(within(details()).getByText(/^youtube\.com · Saved just now · on iPhone$/)).toBeInTheDocument();
    expect(within(details()).getByText("To sort")).toBeInTheDocument();
    expect(within(details()).getByText("Coming soon")).toBeInTheDocument();
    expect(within(details()).getByRole("link", { name: /Open ↗/ })).toHaveAttribute("href", "https://www.youtube.com/watch?v=1");
  });

  it("offers no Open for a saved URL that is not http or https", async () => {
    await renderDetails(savedLink({ originalUrl: "javascript:alert(1)" }));
    expect(within(details()).queryByRole("link", { name: /Open/ })).not.toBeInTheDocument();
  });

  it("links each collection tag to its collection", async () => {
    await renderDetails(savedLink({ collections: [{ id: rust.id, name: "rust" }] }));
    expect(within(details()).getByRole("link", { name: "Rust" })).toHaveAttribute("href", `/c/${rust.id}`);
    expect(within(details()).queryByText("To sort")).not.toBeInTheDocument();
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

  it("saves the note with keepalive when the page is hidden, so closing the tab keeps it", async () => {
    await renderDetails(savedLink());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "before closing");
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    visibility.mockRestore();
    await waitFor(() => { expect(patches()).toEqual([{ note: "before closing" }]); });
    expect(request).toHaveBeenCalledWith(expect.any(String), expect.anything(), expect.objectContaining({ method: "PATCH", keepalive: true }));
  });

  it("saves the note when the page is being unloaded", async () => {
    await renderDetails(savedLink());
    await userEvent.type(screen.getByRole("textbox", { name: "Note" }), "on pagehide");
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    await waitFor(() => { expect(patches()).toEqual([{ note: "on pagehide" }]); });
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
