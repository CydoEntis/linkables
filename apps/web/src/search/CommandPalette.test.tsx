import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listedCollection } from "../collections/test-collections";
import { useLinksUi } from "../links/links-ui-store";
import { CommandPalette } from "./CommandPalette";
import { useListShortcuts } from "./use-list-shortcuts";

const request = vi.hoisted(() => vi.fn<(path: string) => Promise<unknown>>());
vi.mock("../api/api", () => ({ api: { request } }));

const navigate = vi.hoisted(() => vi.fn());
vi.mock(import("@tanstack/react-router"), async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => navigate }));

const japan = listedCollection({ name: "trip to Japan" });

type HarnessProps = { onSearch: (q: string) => void; onBookmarklet: () => void; onShortcuts: () => void; otherDialog?: boolean };

function Harness({ otherDialog = false, ...handlers }: HarnessProps) {
  const [open, setOpen] = useState(false);
  useListShortcuts({ onPalette: () => { setOpen((value) => !value); }, onHelp: handlers.onShortcuts });
  return (
    <>
      <input aria-label="Search your links" data-search-field />
      <input aria-label="Note" />
      {otherDialog ? <div role="dialog" aria-label="Link details" /> : null}
      <CommandPalette open={open} onOpenChange={setOpen} {...handlers} />
    </>
  );
}

function renderPalette({ otherDialog = false } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const handlers = { onSearch: vi.fn(), onBookmarklet: vi.fn(), onShortcuts: vi.fn() };
  render(
    <QueryClientProvider client={queryClient}>
      <Harness {...handlers} otherDialog={otherDialog} />
    </QueryClientProvider>,
  );
  return { ...handlers, user: userEvent.setup() };
}

async function openPalette(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard("{Control>}k{/Control}");
  return screen.findByRole("dialog", { name: "Command palette" });
}

beforeEach(() => {
  request.mockReset();
  request.mockResolvedValue({ items: [japan] });
  navigate.mockReset();
  useLinksUi.setState({ saveSheetOpen: false });
});

describe("CommandPalette", () => {
  it("opens with Ctrl+K and focuses its search", async () => {
    const { user } = renderPalette();
    await openPalette(user);
    expect(screen.getByRole("combobox", { name: "Search commands" })).toHaveFocus();
  });

  it("stays shut while another dialog is open", async () => {
    const { user } = renderPalette({ otherDialog: true });
    await user.keyboard("{Control>}k{/Control}");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole("dialog", { name: "Command palette" })).not.toBeInTheDocument();
  });

  it("searches links for the typed text", async () => {
    const { user, onSearch } = renderPalette();
    await openPalette(user);
    await user.keyboard("tokyo");
    await user.click(screen.getByRole("option", { name: "Search links for “tokyo”" }));
    expect(onSearch).toHaveBeenCalledWith("tokyo");
    expect(screen.queryByRole("dialog", { name: "Command palette" })).not.toBeInTheDocument();
  });

  it("narrows the commands to the ones matching the text", async () => {
    const { user } = renderPalette();
    const palette = await openPalette(user);
    await user.keyboard("sort");
    const options = within(palette).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Search links for “sort”", "Go to To sort"]);
  });

  it("goes to a view or a collection", async () => {
    const { user } = renderPalette();
    await openPalette(user);
    await user.click(screen.getByRole("option", { name: "Go to Pinned" }));
    expect(navigate).toHaveBeenCalledWith({ to: "/", search: { view: "pinned" } });

    await openPalette(user);
    await user.click(await screen.findByRole("option", { name: "Go to Trip to Japan" }));
    expect(navigate).toHaveBeenCalledWith({ to: "/c/$collectionId", params: { collectionId: japan.id } });
  });

  it("goes to Save from anywhere", async () => {
    const { user } = renderPalette();
    await openPalette(user);
    await user.click(screen.getByRole("option", { name: "Save from anywhere" }));
    expect(navigate).toHaveBeenCalledWith({ to: "/save-from-anywhere" });
  });

  it("runs the highlighted command with Enter, searching by default", async () => {
    const { user, onBookmarklet, onSearch } = renderPalette();
    await openPalette(user);
    await user.keyboard("bookmark{ArrowDown}{Enter}");
    expect(onBookmarklet).toHaveBeenCalled();
    await openPalette(user);
    await user.keyboard("bookmark{Enter}");
    expect(onSearch).toHaveBeenCalledWith("bookmark");
  });

  it("opens the save sheet when the bar to save from is not showing", async () => {
    const { user } = renderPalette();
    await openPalette(user);
    await user.click(screen.getByRole("option", { name: "Save a link" }));
    expect(useLinksUi.getState().saveSheetOpen).toBe(true);
  });

  it("opens the shortcut list from the palette and with ?", async () => {
    const { user, onShortcuts } = renderPalette();
    await user.keyboard("?");
    expect(onShortcuts).toHaveBeenCalledTimes(1);
    await openPalette(user);
    await user.click(screen.getByRole("option", { name: "Keyboard shortcuts" }));
    expect(onShortcuts).toHaveBeenCalledTimes(2);
  });
});

describe("list shortcuts", () => {
  it("focuses search with /, but not while typing in another field", async () => {
    const { user, onShortcuts } = renderPalette();
    await user.click(screen.getByRole("textbox", { name: "Note" }));
    await user.keyboard("/?");
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("/?");
    expect(onShortcuts).not.toHaveBeenCalled();
    await user.click(document.body);
    await user.keyboard("/");
    expect(screen.getByRole("textbox", { name: "Search your links" })).toHaveFocus();
  });
});
